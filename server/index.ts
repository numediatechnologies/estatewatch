import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { fileURLToPath } from 'node:url';
import { alertsRouter } from './routes/alerts.js';
import { estatesRouter } from './routes/estates.js';
import { notificationsRouter } from './routes/notificationsRoutes.js';
import { pipelineRouter } from './routes/pipeline.js';
import { createFirecrawlClient, discoverGazettes } from './firecrawlDiscovery.js';
import { insertEstate, loadAlerts, runIngestion } from './ingestService.js';
import { matchEstateToAlerts } from './matching.js';
import { recordMatches, retryFailedEmailNotifications } from './notifications.js';
import { query } from './db.js';
import { initializeDatabase } from './initDb.js';
import { authenticateWithNeon, clearSessionCookie, createSessionToken, readSession, requestPasswordResetWithNeon, resetPasswordWithNeon, setSessionCookie } from './auth.js';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { normalizeSmsRecipient, sendVerificationSms } from './smsService.js';
import { sendBillingDocumentEmail, sendContactMessage, sendTestEmail } from './emailService.js';
import { listOperationalIncidents, notifyAdminOfIncident, resolveOperationalIncident } from './operationalIncidents.js';
import { buildMarketDirectContactPayload, sendContactToMarketDirectCrm } from './leadCrmService.js';
import { ALLOWED_CONTACT_ENQUIRIES, applySecurityHeaders, CONTACT_FIELD_LIMITS, consumeContactRateLimit } from './security.js';
import { recordAuditEvent, maskedPhone } from './audit.js';
import { getDataQualityReport } from './estateRetention.js';
import { getEntitlement, getUsage } from './entitlements.js';
import { BANK_PAYMENT_DETAILS, PLAN_PRICES_CENTS, createCheckoutFields, payfastEndpoint, verifySignature } from './payments.js';
import { billingDocumentHtml, createBillingDocument, createInvoiceForPayment, renderBillingPdf } from './billingDocuments.js';
import { estateSchema, simulationSchema } from './types.js';
import { validate } from './validate.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

interface AppDependencies {
  discover: typeof discoverGazettes;
  createClient: typeof createFirecrawlClient;
  ingest: typeof runIngestion;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configuredToken = process.env.ADMIN_API_TOKEN;
  if (!configuredToken && process.env.NODE_ENV !== 'production') return next();
  if (!configuredToken) return res.status(503).json({ error: 'ADMIN_API_TOKEN is required in production' });
  const session = readSession(req);
  if (req.header('authorization') !== `Bearer ${configuredToken}` && session?.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireCron(req: Request, res: Response, next: NextFunction) {
  if (!process.env.CRON_SECRET) return res.status(503).json({ error: 'CRON_SECRET is required' });
  if (req.header('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

export function createApp(dependencies: AppDependencies = {
  discover: discoverGazettes,
  createClient: createFirecrawlClient,
  ingest: runIngestion,
}) {
const application = express();
application.use(cors());
application.use(express.json({ limit: '1mb' }));
application.use(express.urlencoded({ extended: false }));
application.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, surname, companyName, phone, verificationMethod = 'email' } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'A valid email and password of at least 8 characters are required' });
    if (typeof firstName !== 'string' || firstName.trim().length < 2 || typeof surname !== 'string' || surname.trim().length < 2) return res.status(400).json({ error: 'First name and surname are required' });
    if (verificationMethod !== 'email') return res.status(400).json({ error: 'Use the SMS verification start endpoint for mobile verification' });
    let normalizedPhone: string | undefined;
    if (String(phone || '').trim()) { try { normalizedPhone = normalizeSmsRecipient(String(phone)); } catch { return res.status(400).json({ error: 'A valid mobile number is required' }); } }
    const session = await authenticateWithNeon('sign-up', { email, password, firstName: firstName.trim(), surname: surname.trim(), companyName, phone: normalizedPhone });
    await recordAuditEvent({ eventType:'account.registered', actor:session, status:'pending_email_verification', channel:'email', metadata:{ phone:maskedPhone(normalizedPhone) } });
    res.status(202).json({ success: true, verificationRequired: true, method: 'email', message: `Great! Check ${session.email} and follow the verification link, then sign in.` });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message }); }
});
application.post('/api/contact', async (req, res) => {
  try {
    if (String(req.body?.website || '').trim()) return res.json({ success: true, message: 'Thanks — your message has been received.' });
    if (!consumeContactRateLimit(req, res)) return res.status(429).json({ error: 'Too many contact requests. Please wait a few minutes and try again.' });
    const name = String(req.body?.name || '').trim();
    const company = String(req.body?.company || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();
    const enquiry = String(req.body?.enquiry || '').trim();
    const message = String(req.body?.message || '').trim();
    if (name.length < 2 || name.length > CONTACT_FIELD_LIMITS.name) return res.status(400).json({ error: `Name must be between 2 and ${CONTACT_FIELD_LIMITS.name} characters.` });
    if (company.length > CONTACT_FIELD_LIMITS.company) return res.status(400).json({ error: `Company name is limited to ${CONTACT_FIELD_LIMITS.company} characters.` });
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > CONTACT_FIELD_LIMITS.email) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (phone.length > CONTACT_FIELD_LIMITS.phone) return res.status(400).json({ error: `Phone number is limited to ${CONTACT_FIELD_LIMITS.phone} characters.` });
    if (!ALLOWED_CONTACT_ENQUIRIES.has(enquiry) || enquiry.length > CONTACT_FIELD_LIMITS.enquiry) return res.status(400).json({ error: 'Please select a valid enquiry type.' });
    if (message.length < 10 || message.length > CONTACT_FIELD_LIMITS.message) return res.status(400).json({ error: `Message must be between 10 and ${CONTACT_FIELD_LIMITS.message} characters.` });
    const submissionId = randomUUID();
    const contactMetadata = { name, company, email, phone:maskedPhone(phone), enquiry, message };
    await recordAuditEvent({ eventType:'contact.received', channel:'web', status:'queued', idempotencyKey:`contact:${submissionId}:received`, metadata:contactMetadata });
    const crmPayload = buildMarketDirectContactPayload({ name, company, email, phone, enquiry, message, submissionId, followUpPriority: req.body?.followUpPriority });
    const crmResult = await sendContactToMarketDirectCrm(crmPayload);
    if (!crmResult.success) { await recordAuditEvent({ eventType:'contact.crm_delivery', channel:'crm', status:'failed', idempotencyKey:`contact:${submissionId}:crm`, metadata:{...contactMetadata,error:crmResult.error} }); return res.status(502).json({ error: `Your request was not sent because the sales follow-up queue could not be updated. ${crmResult.error} Please try again.` }); }
    const result = await sendContactMessage({ name, company, email, phone, enquiry, message });
    if (!result.success) { await recordAuditEvent({ eventType:'contact.email_delivery', channel:'email', status:'failed', idempotencyKey:`contact:${submissionId}:email`, metadata:{...contactMetadata,error:result.error} }); return res.status(502).json({ error: result.error || 'Contact email could not be sent.' }); }
    await recordAuditEvent({ eventType:'contact.email_delivery', channel:'email', status:'sent', idempotencyKey:`contact:${submissionId}:email`, metadata:contactMetadata });
    res.json({ success: true, message: 'Thanks — your message has been sent to the EstateWatch team and added to the follow-up queue.' });
  } catch (error: any) { res.status(500).json({ error: error.message || 'Contact email could not be sent.' }); }
});
const verificationHash = (id: string, code: string) => {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.ADMIN_API_TOKEN;
  if (!secret) throw Object.assign(new Error('Registration verification is not configured'), { status: 503 });
  return createHmac('sha256', secret).update(`${id}:${code}`).digest('hex');
};
application.post('/api/auth/register/sms/start', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    const phone = normalizeSmsRecipient(String(req.body?.phone || ''));
    if (!phone.startsWith('27')) return res.status(400).json({ error: 'Enter a South African mobile number' });
    const recent = await query(`SELECT count(*)::int count FROM registration_verifications WHERE (email=$1 OR phone_number=$2) AND created_at > NOW() - INTERVAL '10 minutes'`, [email, phone]);
    if (Number(recent.rows[0]?.count) >= 3) return res.status(429).json({ error: 'Too many verification requests. Please wait 10 minutes and try again.' });
    const id = randomUUID(); const code = String(randomInt(100000, 1000000));
    await query(`INSERT INTO registration_verifications(id,email,phone_number,code_hash,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '5 minutes')`, [id, email, phone, verificationHash(id, code)]);
    const sent = await sendVerificationSms(phone, code);
    await recordAuditEvent({ eventType:'phone.otp_requested', channel:'sms', status:sent.success?'sent':'failed', idempotencyKey:`otp:${id}`, metadata:{ email, phone:maskedPhone(phone) } });
    if (!sent.success) { await query('DELETE FROM registration_verifications WHERE id=$1', [id]); throw Object.assign(new Error('We could not send the SMS. Choose email verification or try again.'), { status: 502 }); }
    res.status(202).json({ success: true, challengeId: id, phoneMasked: `***${phone.slice(-4)}`, message: `We sent a six-digit code to ***${phone.slice(-4)}.` });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message }); }
});
application.post('/api/auth/register/sms/verify', async (req, res) => {
  try {
    const { challengeId, code, email, password, firstName, surname } = req.body || {};
    if (!/^[0-9]{6}$/.test(String(code || '')) || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Enter the six-digit code and a password of at least 8 characters' });
    if (typeof firstName !== 'string' || firstName.trim().length < 2 || typeof surname !== 'string' || surname.trim().length < 2) return res.status(400).json({ error: 'First name and surname are required' });
    const result = await query(`SELECT * FROM registration_verifications WHERE id=$1 AND used_at IS NULL`, [challengeId]);
    const challenge = result.rows[0];
    if (!challenge || challenge.expires_at < new Date() || challenge.attempts >= 5 || challenge.email !== String(email).toLowerCase()) { await recordAuditEvent({ eventType:'phone.otp_rejected', channel:'sms', status:challenge?.expires_at < new Date()?'expired':'invalid', subjectType:'registration_verification', subjectId:String(challengeId||'') }); return res.status(400).json({ error: 'That code is invalid or expired. Request a new code.' }); }
    const expected = Buffer.from(challenge.code_hash); const actual = Buffer.from(verificationHash(challengeId, String(code)));
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) { await query('UPDATE registration_verifications SET attempts=attempts+1 WHERE id=$1', [challengeId]); await recordAuditEvent({eventType:'phone.otp_rejected',channel:'sms',status:'incorrect',subjectType:'registration_verification',subjectId:String(challengeId)}); return res.status(400).json({ error: 'That code is incorrect.' }); }
    const session = await authenticateWithNeon('sign-up', { email: challenge.email, password, firstName: firstName.trim(), surname: surname.trim(), companyName: undefined, phone: challenge.phone_number });
    await query('UPDATE registration_verifications SET used_at=NOW() WHERE id=$1', [challengeId]);
    await query('UPDATE user_profiles SET phone_number=$1,phone_verified_at=NOW() WHERE auth_subject=$2', [challenge.phone_number, session.sub]);
    await recordAuditEvent({ eventType:'phone.verification', actor:session, userId:session.sub, channel:'sms', status:'verified', subjectType:'registration_verification', subjectId:challengeId, metadata:{ phone:maskedPhone(challenge.phone_number) } });
    setSessionCookie(res, createSessionToken(session));
    res.status(201).json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role, subscriptionActive: session.subscriptionActive, companyName: session.companyName, phoneMasked: maskedPhone(challenge.phone_number), phoneVerified: true, subscriptionStatus: session.subscriptionStatus, subscriptionExpiresAt: session.subscriptionExpiresAt } });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message }); }
});
application.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required' });
    const session = await authenticateWithNeon('sign-in', { email, password });
    setSessionCookie(res, createSessionToken(session));
    await recordAuditEvent({ eventType:'auth.sign_in', actor:session, status:'success', channel:'password' });
    res.json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role, subscriptionActive: session.subscriptionActive, companyName: session.companyName, phoneMasked: session.phoneMasked, phoneVerified: session.phoneVerified, subscriptionStatus: session.subscriptionStatus, subscriptionExpiresAt: session.subscriptionExpiresAt } });
  } catch (error: any) { res.status(error.status || 401).json({ error: error.message }); }
});
application.post('/api/auth/forgot-password', async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A valid email address is required' });
  try {
    await requestPasswordResetWithNeon(email.toLowerCase());
  } catch (error: any) {
    // Preserve a generic response for valid addresses so this endpoint cannot be
    // used to discover which people have EstateWatch accounts.
    if (error.status !== 400 && error.status !== 404) return res.status(error.status || 502).json({ error: 'Password reset service is temporarily unavailable' });
  }
  await recordAuditEvent({ eventType:'auth.password_reset_requested', channel:'email', status:'accepted', metadata:{ email: String(email).toLowerCase() } });
  res.json({ success: true, message: 'If an account exists for that email, a password reset link has been sent.' });
});
application.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (typeof token !== 'string' || token.length < 10) return res.status(400).json({ error: 'A valid password reset token is required' });
  if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ error: 'The new password must be at least 8 characters' });
  try {
    await resetPasswordWithNeon(token, newPassword);
    clearSessionCookie(res);
    await recordAuditEvent({ eventType:'auth.password_reset_completed', channel:'email', status:'success' });
    res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (error: any) { res.status(error.status || 400).json({ error: error.message || 'The reset link is invalid or expired' }); }
});
application.get('/api/auth/session', (req, res) => {
  const session = readSession(req);
  if (!session) return res.status(401).json({ user: null });
  res.json({ user: { id: session.sub, email: session.email, name: session.name, role: session.role, subscriptionActive: session.subscriptionActive, companyName: session.companyName, phoneMasked: session.phoneMasked, phoneVerified: session.phoneVerified, subscriptionStatus: session.subscriptionStatus, subscriptionExpiresAt: session.subscriptionExpiresAt } });
});
application.post('/api/auth/logout', async (req, res) => { const session=readSession(req); if(session) await recordAuditEvent({eventType:'auth.sign_out',actor:session,status:'success'}); clearSessionCookie(res); res.json({ success: true }); });
application.get('/api/health', async (_req, res) => {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return res.status(503).json({ status: 'degraded', database: 'not_configured' });
  }
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version || 'local' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});
application.use('/api/estates', estatesRouter);
application.use('/api/alerts', alertsRouter);
application.use('/api/pipeline', pipelineRouter);
application.use('/api/notifications', notificationsRouter);

const billingSession = (req: Request, res: Response) => { const session = readSession(req); if (!session) { res.status(401).json({ code: 'AUTH_REQUIRED', error: 'Please sign in to continue.' }); return null; } return session; };
const billingPlan = (value: unknown) => value === 'agency' ? 'agency' : 'pro';
const billingCycle = (value: unknown) => value === 'annual' ? 'annual' : 'monthly';

application.get('/api/billing/entitlement', async (req, res) => { try { const session=billingSession(req,res); if(!session)return; res.json(await getEntitlement(session)); } catch { res.status(503).json({ code:'BILLING_UNAVAILABLE', error:'Billing information is temporarily unavailable.' }); } });
application.get('/api/billing/usage', async (req, res) => { try { const session=billingSession(req,res); if(!session)return; const entitlement=await getEntitlement(session); res.json({ limits: entitlement.limits, usage: entitlement.usage || await getUsage(session.sub), plan: entitlement.plan }); } catch { res.status(503).json({ code:'BILLING_UNAVAILABLE', error:'Usage information is temporarily unavailable.' }); } });

application.post('/api/billing/quotes', async (req, res) => {
  try {
    const session=billingSession(req,res); if(!session)return;
    const plan=billingPlan(req.body?.plan), cycle=billingCycle(req.body?.billingCycle);
    const customer={ name:String(req.body?.contactName||session.name||session.email).trim(), companyName:String(req.body?.companyName||session.companyName||'').trim(), email:session.email, phone:String(req.body?.phone||'').trim(), vatNumber:String(req.body?.vatNumber||'').trim() };
    const document=await createBillingDocument({ userId:session.sub,type:'quote',plan,cycle,customer,status:'sent' });
    void renderBillingPdf(document).then((pdf) => sendBillingDocumentEmail({ to: session.email, document, pdf }));
    res.status(201).json({ document, message:'Your quote is ready on screen and has been queued for email delivery.' });
  } catch (error:any) { res.status(500).json({ code:'QUOTE_FAILED', error:'We could not create your quote. Please try again.' }); }
});

application.get('/api/billing/documents', async (req,res)=>{ try { const session=billingSession(req,res); if(!session)return; const result=await query(`SELECT * FROM billing_documents WHERE user_id=$1 ORDER BY created_at DESC`,[session.sub]); res.json(result.rows); } catch { res.status(503).json({code:'BILLING_UNAVAILABLE',error:'Your documents are temporarily unavailable.'}); } });
application.get('/api/billing/documents/:id', async (req,res)=>{ try { const session=billingSession(req,res); if(!session)return; const result=await query(`SELECT * FROM billing_documents WHERE id=$1 AND user_id=$2`,[req.params.id,session.sub]); if(!result.rows[0])return res.status(404).json({code:'DOCUMENT_NOT_FOUND',error:'We could not find that document.'}); res.json(result.rows[0]); } catch { res.status(503).json({code:'BILLING_UNAVAILABLE',error:'Your document is temporarily unavailable.'}); } });
application.get('/api/billing/documents/:id/pdf', async (req,res)=>{ try { const session=billingSession(req,res); if(!session)return; const result=await query(`SELECT * FROM billing_documents WHERE id=$1 AND user_id=$2`,[req.params.id,session.sub]); if(!result.rows[0])return res.status(404).json({code:'DOCUMENT_NOT_FOUND',error:'We could not find that document.'}); const pdf=await renderBillingPdf(result.rows[0]); res.type('application/pdf').set('Content-Disposition',`inline; filename=${result.rows[0].document_number}.pdf`).send(pdf); } catch { res.status(503).json({code:'PDF_UNAVAILABLE',error:'We could not prepare that PDF.'}); } });

application.post('/api/billing/checkout', async (req,res)=>{ try { const session=billingSession(req,res); if(!session)return; const plan=billingPlan(req.body?.plan), cycle=billingCycle(req.body?.billingCycle), amount=PLAN_PRICES_CENTS[plan][cycle]; const quoteId=req.body?.quoteId ? String(req.body.quoteId) : null; if(quoteId){ const owned=await query('SELECT id FROM billing_documents WHERE id=$1 AND user_id=$2 AND type=\'quote\' AND status IN (\'sent\',\'ready_to_pay\')',[quoteId,session.sub]); if(!owned.rows[0])return res.status(404).json({code:'DOCUMENT_NOT_FOUND',error:'We could not find that quote.'}); } const reference=`EW-${randomUUID()}`; const result=await query(`INSERT INTO billing_payments(user_id,plan_key,billing_cycle,payment_method,status,amount_cents,reference,quote_id) VALUES($1,$2,$3,$4,'pending',$5,$6,$7) RETURNING *`,[session.sub,plan,cycle,req.body?.method==='bank_transfer'?'bank_transfer':'payfast',amount,reference,quoteId]); if(req.body?.method==='bank_transfer') return res.status(201).json({ payment:result.rows[0], bankDetails:BANK_PAYMENT_DETAILS, message:'Your bank payment reference is ready. Upload proof once payment is made.' }); const fields=createCheckoutFields({reference,amountCents:amount,planName:plan==='agency'?'Agency / Firm':'Pro Solo',email:session.email,baseUrl:process.env.APP_URL||'https://estatewatch-ivory.vercel.app'}); res.status(201).json({payment:result.rows[0],checkout:{endpoint:payfastEndpoint(),fields}}); } catch { res.status(503).json({code:'CHECKOUT_UNAVAILABLE',error:'This payment service is temporarily unavailable.'}); } });
application.post('/api/billing/bank-proof', async (req,res)=>{ try { const session=billingSession(req,res); if(!session)return; const reference=String(req.body?.reference||'').trim(); if(!reference)return res.status(400).json({code:'REFERENCE_REQUIRED',error:'Enter your payment reference.'}); const result=await query(`UPDATE billing_payments SET status='awaiting_review',proof_note=$1,updated_at=NOW() WHERE reference=$2 AND user_id=$3 AND payment_method='bank_transfer' RETURNING *`,[String(req.body?.note||'').slice(0,1000),reference,session.sub]); if(!result.rows[0])return res.status(404).json({code:'PAYMENT_NOT_FOUND',error:'We could not find that payment reference.'}); res.json({payment:result.rows[0],message:'Your bank payment is awaiting review.'}); } catch { res.status(503).json({code:'PAYMENT_UNAVAILABLE',error:'We could not record your proof of payment.'}); } });
application.get('/api/billing/payments', async (req,res)=>{ try { const session=billingSession(req,res); if(!session)return; const result=await query('SELECT * FROM billing_payments WHERE user_id=$1 ORDER BY created_at DESC',[session.sub]); res.json(result.rows); } catch { res.status(503).json({code:'BILLING_UNAVAILABLE',error:'Your payment history is temporarily unavailable.'}); } });
application.post('/api/payfast/itn', async (req,res)=>{ try { const fields=req.body||{}; if(String(fields.merchant_id)!==String(process.env.PAYFAST_MERCHANT_ID||'10000100')||!verifySignature(fields))return res.status(400).send('Invalid payment notification'); const result=await query('SELECT * FROM billing_payments WHERE reference=$1',[String(fields.m_payment_id||'')]); const payment=result.rows[0]; if(!payment)return res.status(404).send('Payment reference not found'); if(payment.status==='paid')return res.status(200).send('OK'); const status=String(fields.payment_status||'').toUpperCase()==='COMPLETE'?'paid':String(fields.payment_status||'').toUpperCase()==='CANCELLED'?'cancelled':'failed'; await query('UPDATE billing_payments SET status=$1,gateway_payment_id=$2,paid_at=CASE WHEN $1=\'paid\' THEN NOW() ELSE paid_at END,raw_payload=$3::jsonb,updated_at=NOW() WHERE id=$4',[status,String(fields.pf_payment_id||''),JSON.stringify(fields),payment.id]); if(status==='paid'){ await query(`UPDATE user_profiles SET subscription_status='active',subscription_plan=$1,subscription_expires_at=NOW()+CASE WHEN $2='annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END WHERE auth_subject=$3`,[payment.plan_key,payment.billing_cycle,payment.user_id]); const invoice=await createInvoiceForPayment({...payment,status:'paid'}); if(payment.quote_id) await query(`UPDATE billing_documents SET status='converted_to_invoice',payment_id=$1 WHERE id=$2 AND user_id=$3`,[payment.id,payment.quote_id,payment.user_id]); void invoice; } res.status(200).send('OK'); } catch { res.status(500).send('Payment notification unavailable'); } });

application.post('/api/run-fetch', requireAdmin, async (req, res) => {
  try {
    const result = await dependencies.discover(dependencies.createClient(), {
      maxPages: Number(req.body?.maxPages) || 10,
    });
    res.json({ success: true, ...result });
  } catch (error: any) {
    const status = /FIRECRAWL_API_KEY/.test(error.message) ? 503 : 502;
    res.status(status).json({ success: false, error: error.message });
  }
});

application.post('/api/ingest-gazettes', requireAdmin, async (req, res) => {
  try {
    const sourceUrls = Array.isArray(req.body?.sourceUrls) ? req.body.sourceUrls.filter((url: unknown) => typeof url === 'string') : undefined;
    const result = await dependencies.ingest({ sourceUrls });
    res.status(result.status === 'completed' ? 200 : 502).json({ success: result.status === 'completed', data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
application.post('/api/simulate-match', requireAdmin, validate(simulationSchema), async (req, res) => {
  try {
    const { testAlertId, ...estateInput } = req.body;
    const estate = { ...estateInput, id: estateInput.id || `sim-${randomUUID()}` };
    const alerts = await loadAlerts();
    if (testAlertId) {
      const selectedAlert = alerts.find((alert: any) => alert.id === testAlertId);
      if (!selectedAlert) return res.status(404).json({ success: false, error: 'The selected alert is no longer available.' });
      // The stored fingerprint never leaves the server; it is only applied to this admin test notice.
      if (selectedAlert.idNumberHash) (estate as any).idNumberHash = selectedAlert.idNumberHash;
    }
    const matches = matchEstateToAlerts(estate, alerts);
    await insertEstate(estate);
    const events = await recordMatches(estate, matches);
    res.json({
      success: true,
      estate,
      matchedAlerts: matches.map((match) => ({ id: match.alertId, name: match.alertName, score: match.score, reasons: match.reasons })),
      notifications: events,
      notification: events[0] || null,
      message: matches.length ? `Simulation matched ${matches.length} active alert${matches.length === 1 ? '' : 's'}.` : 'Simulation completed without matching an active alert.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Simulation failed' });
  }
});
application.post('/api/admin/migrate', requireAdmin, async (_req, res) => {
  try {
    await initializeDatabase();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
application.get('/api/admin/subscriptions', requireAdmin, async (_req, res) => {
  try { const result=await query(`SELECT auth_subject,email,display_name,role,phone_number,phone_verified_at,subscription_status,subscription_expires_at,created_at FROM user_profiles ORDER BY created_at DESC`); res.json(result.rows.map((row:any)=>({id:row.auth_subject,email:row.email,name:row.display_name,role:row.role,phoneMasked:maskedPhone(row.phone_number),phoneVerified:Boolean(row.phone_verified_at),subscriptionStatus:row.subscription_status,subscriptionExpiresAt:row.subscription_expires_at,createdAt:row.created_at}))); }
  catch(error:any){res.status(500).json({error:error.message});}
});
application.patch('/api/admin/subscriptions/:id', requireAdmin, async (req,res) => {
  try { const status=String(req.body?.status||'').trim().toLowerCase(); const accountId=String(req.params.id); if(!['active','inactive','paused','cancelled'].includes(status))return res.status(400).json({error:'Invalid subscription status'}); const expiryValue=typeof req.body?.expiresAt==='string'?req.body.expiresAt:null; const expiresAt=expiryValue?new Date(expiryValue):null; if(expiryValue&&Number.isNaN(expiresAt?.getTime()))return res.status(400).json({error:'Invalid subscription expiry'}); const result=await query(`UPDATE user_profiles SET subscription_status=$1,subscription_expires_at=$2 WHERE auth_subject=$3 RETURNING auth_subject,email,display_name,subscription_status,subscription_expires_at`,[status,expiresAt,accountId]); if(!result.rows[0])return res.status(404).json({error:'User account not found'}); await query(`UPDATE alerts SET is_active=CASE WHEN $1='active' THEN is_active ELSE FALSE END,delivery_state=CASE WHEN $1='active' THEN delivery_state ELSE 'paused' END WHERE owner_id=$2`,[status,accountId]); await recordAuditEvent({eventType:'subscription.changed',userId:accountId,status,subjectType:'user',subjectId:accountId,metadata:{expiresAt:expiryValue}}); res.json({id:result.rows[0].auth_subject,email:result.rows[0].email,name:result.rows[0].display_name,subscriptionStatus:result.rows[0].subscription_status,subscriptionExpiresAt:result.rows[0].subscription_expires_at}); }
  catch(error:any){res.status(500).json({error:error.message});}
});
application.get('/api/admin/audit', requireAdmin, async (req,res) => {
  try { const values:any[]=[]; const filters:string[]=[]; const add=(field:string,value:unknown)=>{if(typeof value==='string'&&value.trim()){values.push(value.trim());filters.push(`${field}=$${values.length}`);}}; add('user_id',req.query.userId); add('event_type',req.query.eventType); add('channel',req.query.channel); add('status',req.query.status); const limit=Math.min(Math.max(Number(req.query.limit)||200,1),1000); values.push(limit); const result=await query(`SELECT id,event_type,actor_id,actor_email,actor_role,user_id,channel,status,subject_type,subject_id,metadata,created_at FROM audit_events ${filters.length?'WHERE '+filters.join(' AND '):''} ORDER BY created_at DESC LIMIT $${values.length}`,values); res.json(result.rows); }
  catch(error:any){res.status(500).json({error:error.message});}
});
application.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS app_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
    const result = await query(`SELECT setting_key, setting_value FROM app_settings WHERE setting_key = ANY($1::text[])`, [['legalCompanyName', 'tradingName', 'notificationEmail']]);
    const values = Object.fromEntries(result.rows.map((row: any) => [row.setting_key, row.setting_value]));
    res.json({
      legalCompanyName: values.legalCompanyName || 'NuMedia Direct Marketing (Pty) Ltd',
      tradingName: values.tradingName || 'EstateWatch',
      notificationEmail: values.notificationEmail || process.env.ADMIN_EMAIL || '',
      adminEmail: process.env.ADMIN_EMAIL || '',
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      zeptomailConfigured: Boolean(process.env.ZEPTOMAIL_TOKEN),
      emailProvider: process.env.EMAIL_PROVIDER || 'auto',
      incidentRecipientConfigured: Boolean(process.env.INGESTION_INCIDENT_EMAIL || process.env.ADMIN_EMAIL),
      neonAuthConfigured: Boolean(process.env.NEON_AUTH_BASE_URL),
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
application.patch('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    await query(`CREATE TABLE IF NOT EXISTS app_settings (setting_key VARCHAR(100) PRIMARY KEY, setting_value TEXT NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
    const legalCompanyName = String(req.body?.legalCompanyName || '').trim();
    const tradingName = String(req.body?.tradingName || '').trim();
    const notificationEmail = String(req.body?.notificationEmail || '').trim().toLowerCase();
    if (legalCompanyName.length < 2 || legalCompanyName.length > 255) return res.status(400).json({ error: 'Enter a valid legal company name' });
    if (tradingName.length < 2 || tradingName.length > 255) return res.status(400).json({ error: 'Enter a valid trading name' });
    if (!/^\S+@\S+\.\S+$/.test(notificationEmail)) return res.status(400).json({ error: 'Enter a valid notification email address' });
    for (const [key, value] of [['legalCompanyName', legalCompanyName], ['tradingName', tradingName], ['notificationEmail', notificationEmail]]) {
      await query(`INSERT INTO app_settings(setting_key, setting_value, updated_at) VALUES($1,$2,NOW()) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW()`, [key, value]);
    }
    res.json({ legalCompanyName, tradingName, notificationEmail, adminEmail: process.env.ADMIN_EMAIL || '', resendConfigured: Boolean(process.env.RESEND_API_KEY), zeptomailConfigured: Boolean(process.env.ZEPTOMAIL_TOKEN), emailProvider: process.env.EMAIL_PROVIDER || 'auto', incidentRecipientConfigured: Boolean(process.env.INGESTION_INCIDENT_EMAIL || process.env.ADMIN_EMAIL), neonAuthConfigured: Boolean(process.env.NEON_AUTH_BASE_URL) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
application.post('/api/admin/settings/test-email', requireAdmin, async (req, res) => {
  const to = String(req.body?.to || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(to)) return res.status(400).json({ error: 'Enter a valid test email address' });
  const result = await sendTestEmail(to);
  res.status(result.success ? 200 : 502).json(result);
});
application.get('/api/admin/incidents', requireAdmin, async (req, res) => {
  try { res.json(await listOperationalIncidents(Number(req.query.limit) || 100)); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});
application.get('/api/admin/data-quality', requireAdmin, async (_req, res) => {
  try { res.json(await getDataQualityReport()); }
  catch (error: any) { res.status(500).json({ error: error.message }); }
});
application.patch('/api/admin/incidents/:id/resolve', requireAdmin, async (req, res) => {
  try {
    const incident = await resolveOperationalIncident(String(req.params.id));
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
application.get('/api/cron/ingest', requireCron, async (_req, res) => {
  try {
    const result = await dependencies.ingest();
    if (result.status !== 'completed') {
      const detail = result.errors.map((entry) => `${entry.url}: ${entry.error}`).join('; ') || 'Ingestion was flagged without an error detail';
      const incident = await notifyAdminOfIncident({ type: 'cron_failure', severity: 'high', summary: 'Scheduled Gazette ingestion failed', detail, ingestionId: result.ingestionId, dedupeKey: `cron:${result.ingestionId}:${detail}` });
      return res.status(502).json({ success: false, data: result, incident: { id: incident.incident?.id, operatorNotified: incident.email.success, provider: incident.email.success ? incident.email.provider : undefined, attempts: incident.email.attempts || [] } });
    }
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const incident = await notifyAdminOfIncident({ type: 'cron_failure', severity: 'critical', summary: 'Scheduled Gazette ingestion crashed', detail: error.message || String(error), dedupeKey: `cron-crash:${error.message || String(error)}` });
    res.status(500).json({ success: false, error: error.message, incident: { id: incident.incident?.id, operatorNotified: incident.email.success, provider: incident.email.success ? incident.email.provider : undefined, attempts: incident.email.attempts || [] } });
  }
});

application.get('/api/cron/watchdog', requireCron, async (_req, res) => {
  try {
    const now = new Date();
    const hour = now.getUTCHours();
    const slotStart = new Date(now);
    if (hour < 10) slotStart.setUTCHours(4, 0, 0, 0);
    else slotStart.setUTCHours(11, 0, 0, 0);
    const recent = await query(`SELECT ingestion_id, status, completed_at FROM ingestion_runs
      WHERE status='completed' AND completed_at >= $1 ORDER BY completed_at DESC LIMIT 1`, [slotStart.toISOString()]);
    if (recent.rows[0]) return res.json({ success: true, status: 'healthy', run: recent.rows[0] });
    const detail = `No completed Gazette ingestion was recorded after ${slotStart.toISOString()}. The scheduled run may have been missed or failed before completion.`;
    const incident = await notifyAdminOfIncident({ type: 'cron_failure', severity: 'critical', summary: 'Gazette ingestion watchdog detected a missed run', detail, dedupeKey: `watchdog:${slotStart.toISOString().slice(0, 13)}` });
    return res.status(502).json({ success: false, status: 'missed', detail, incident: { id: incident.incident?.id, operatorNotified: incident.email.success, provider: incident.email.success ? incident.email.provider : undefined, attempts: incident.email.attempts || [] } });
  } catch (error: any) {
    const incident = await notifyAdminOfIncident({ type: 'cron_failure', severity: 'critical', summary: 'Ingestion watchdog crashed', detail: error.message || String(error), dedupeKey: `watchdog-crash:${error.message || String(error)}` });
    return res.status(500).json({ success: false, error: error.message, incident: { id: incident.incident?.id, operatorNotified: incident.email.success } });
  }
});

application.get('/api/cron/retry-notifications', requireCron, async (_req, res) => {
  try {
    const result = await retryFailedEmailNotifications();
    res.json({ success: true, ...result });
  } catch (error: any) {
    const incident = await notifyAdminOfIncident({ type: 'alert_delivery_failure', severity: 'critical', summary: 'Automatic alert retry worker failed', detail: error.message || String(error), dedupeKey: `notification-retry-worker:${error.message || String(error)}` });
    res.status(500).json({ success: false, error: error.message, incident: { id: incident.incident?.id, operatorNotified: incident.email.success } });
  }
});

application.use((_req, res) => res.status(404).json({ error: 'Not found' }));
return application;
}

export const app = createApp();

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  const port = Number(process.env.PORT) || 5050;
  app.listen(port, () => console.log(`EstateWatch API listening on http://localhost:${port}`));
}

export default app;
export const maxDuration = 300;
