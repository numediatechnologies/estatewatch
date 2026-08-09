import { Router } from 'express';
import { query } from '../db.js';
import { alertSchema } from '../types.js';
import { mapAlertRow } from '../mappers.js';
import { validate } from '../validate.js';
import { identityFingerprint, isValidSouthAfricanId, maskSouthAfricanId } from '../identity.js';
import { getEntitlement } from '../entitlements.js';
import { readSession } from '../auth.js';
import { recordAuditEvent } from '../audit.js';

export const alertsRouter = Router();
function sessionOr401(req: any, res: any) { const session = readSession(req); if (!session) { res.status(401).json({ error: 'Sign in to manage alerts' }); return null; } return session; }
function scope(session: { sub: string; role: string }) { return session.role === 'admin' ? ['', []] : [' WHERE owner_id=$1', [session.sub]]; }

alertsRouter.get('/', async (req, res) => {
  try { const session=sessionOr401(req,res); if(!session)return; const [where,params]=scope(session); const result=await query(`SELECT * FROM alerts${where} ORDER BY created_at DESC`,params as any[]); res.json(result.rows.map(mapAlertRow)); }
  catch(err:any){res.status(500).json({error:err.message});}
});

alertsRouter.post('/', validate(alertSchema), async (req,res) => {
  try {
    const session=sessionOr401(req,res); if(!session)return; const a=req.body;
    if(a.idNumberMatch&&!isValidSouthAfricanId(a.idNumberMatch))return res.status(400).json({error:'Enter a valid South African identity number'});
    const entitlement=await getEntitlement(session); const active=session.role==='admin'||entitlement.active?(a.isActive??true):false;
    const id=a.id||`alt-${Date.now()}`, idHash=a.idNumberMatch?identityFingerprint(a.idNumberMatch):null, idMasked=a.idNumberMatch?maskSouthAfricanId(a.idNumberMatch):null;
    await query(`INSERT INTO alerts (id,name,surname_match,provinces,districts,value_bands,asset_types,executor_status,channels,is_active,delivery_state,match_count,last_triggered,created_at,recipient_email,recipient_phone,owner_name,owner_id,id_number_hash,id_number_match_masked)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,surname_match=EXCLUDED.surname_match,provinces=EXCLUDED.provinces,districts=EXCLUDED.districts,value_bands=EXCLUDED.value_bands,asset_types=EXCLUDED.asset_types,executor_status=EXCLUDED.executor_status,channels=EXCLUDED.channels,is_active=EXCLUDED.is_active,delivery_state=EXCLUDED.delivery_state,recipient_email=EXCLUDED.recipient_email,recipient_phone=EXCLUDED.recipient_phone,owner_name=EXCLUDED.owner_name,id_number_hash=EXCLUDED.id_number_hash,id_number_match_masked=EXCLUDED.id_number_match_masked WHERE alerts.owner_id=EXCLUDED.owner_id OR $21='admin'`,
      [id,a.name,a.surnameMatch||null,a.provinces,a.districts||[],a.valueBands,a.assetTypes,a.executorStatus||[],a.channels,active,active?'active':'paused',a.matchCount||0,a.lastTriggered||null,a.createdAt||new Date().toISOString().substring(0,10),a.recipientEmail||session.email,a.recipientPhone||null,a.ownerName||session.name,session.sub,idHash,idMasked,session.role]);
    const saved=await query('SELECT * FROM alerts WHERE id=$1 AND (owner_id=$2 OR $3=$4)',[id,session.sub,session.role,'admin']); if(!saved.rows[0])return res.status(409).json({error:'Alert already belongs to another account'});
    await recordAuditEvent({eventType:'alert.created',actor:session,subjectType:'alert',subjectId:id,status:active?'active':'paused'}); res.status(201).json(mapAlertRow(saved.rows[0]));
  }catch(err:any){res.status(500).json({error:err.message});}
});

alertsRouter.patch('/:id', validate(alertSchema), async (req,res) => {
  try {
    const session=sessionOr401(req,res); if(!session)return; const a=req.body; const current=await query('SELECT * FROM alerts WHERE id=$1 AND (owner_id=$2 OR $3=$4)',[req.params.id,session.sub,session.role,'admin']); if(!current.rows[0])return res.status(404).json({error:'Alert not found'});
    if(a.idNumberMatch&&!isValidSouthAfricanId(a.idNumberMatch))return res.status(400).json({error:'Enter a valid South African identity number'});
    const entitlement=await getEntitlement(session), active=session.role==='admin'||entitlement.active?(a.isActive??true):false;
    const recipientPhone = String(a.recipientPhone || '').startsWith('***') ? current.rows[0].recipient_phone : (a.recipientPhone || null);
    await query(`UPDATE alerts SET name=$1,surname_match=$2,provinces=$3,districts=$4,value_bands=$5,asset_types=$6,executor_status=$7,channels=$8,is_active=$9,delivery_state=$10,recipient_email=$11,recipient_phone=$12,owner_name=$13,id_number_hash=$14,id_number_match_masked=$15 WHERE id=$16 AND (owner_id=$17 OR $18=$19)`,[a.name,a.surnameMatch||null,a.provinces,a.districts||[],a.valueBands,a.assetTypes,a.executorStatus||[],a.channels,active,active?'active':'paused',a.recipientEmail||session.email,recipientPhone,a.ownerName||session.name,a.idNumberMatch?identityFingerprint(a.idNumberMatch):current.rows[0].id_number_hash,a.idNumberMatch?maskSouthAfricanId(a.idNumberMatch):current.rows[0].id_number_match_masked,req.params.id,session.sub,session.role,'admin']);
    const alertId=String(req.params.id); const saved=await query('SELECT * FROM alerts WHERE id=$1',[alertId]); await recordAuditEvent({eventType:'alert.updated',actor:session,subjectType:'alert',subjectId:alertId,status:active?'active':'paused'}); res.json(mapAlertRow(saved.rows[0]));
  }catch(err:any){res.status(500).json({error:err.message});}
});

alertsRouter.patch('/:id/toggle', async (req,res) => {
  try { const session=sessionOr401(req,res); if(!session)return; const current=await query('SELECT is_active FROM alerts WHERE id=$1 AND (owner_id=$2 OR $3=$4)',[req.params.id,session.sub,session.role,'admin']); if(!current.rows[0])return res.status(404).json({error:'Alert not found'}); const active=!current.rows[0].is_active; if(active&&session.role!=='admin'&&!(await getEntitlement(session)).active)return res.status(403).json({error:'An active subscription is required to activate alert delivery'}); await query('UPDATE alerts SET is_active=$1,delivery_state=$2 WHERE id=$3 AND (owner_id=$4 OR $5=$6)',[active,active?'active':'paused',req.params.id,session.sub,session.role,'admin']); await recordAuditEvent({eventType:'alert.toggled',actor:session,subjectType:'alert',subjectId:req.params.id,status:active?'active':'paused'}); res.json({id:req.params.id,isActive:active,deliveryState:active?'active':'paused'}); }
  catch(err:any){res.status(500).json({error:err.message});}
});

alertsRouter.delete('/:id', async (req,res) => {
  try { const session=sessionOr401(req,res); if(!session)return; const result=await query('DELETE FROM alerts WHERE id=$1 AND (owner_id=$2 OR $3=$4)',[req.params.id,session.sub,session.role,'admin']); if(!result.rowCount)return res.status(404).json({error:'Alert not found'}); await recordAuditEvent({eventType:'alert.deleted',actor:session,subjectType:'alert',subjectId:req.params.id}); res.json({success:true,id:req.params.id}); }
  catch(err:any){res.status(500).json({error:err.message});}
});
