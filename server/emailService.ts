import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailParams {
  to: string;
  subject: string;
  estateName: string;
  estateNumber: string;
  province: string;
  district: string;
  valueBand: string;
  executorName: string;
  executorContact: string;
  executorEmail: string;
  gazetteRef: string;
  rawSnippet: string;
  alertName: string;
}

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log(`📧 Using configured SMTP server: ${process.env.SMTP_HOST}`);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Create an Ethereal test account if no custom SMTP credentials provided
  if (!transporterPromise) {
    transporterPromise = (async () => {
      console.log('✉️ Creating Nodemailer Ethereal test account for email notification previewing...');
      const testAccount = await nodemailer.createTestAccount();
      console.log(`✅ Test email account generated: ${testAccount.user}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    })();
  }
  return transporterPromise;
}

export async function sendEstateAlertEmail(params: EmailParams) {
  try {
    const transporter = await getTransporter();

    const fromAddress = process.env.SMTP_FROM || '"EstateWatch Alerts" <alerts@estatewatch.co.za>';

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
          .card { max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #0284c7, #0369a1); padding: 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0 0; color: #bae6fd; font-size: 14px; }
          .content { padding: 24px; }
          .alert-badge { display: inline-block; background-color: #f59e0b; color: #0f172a; font-weight: bold; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
          .grid { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .grid td { padding: 10px 0; border-bottom: 1px solid #334155; }
          .label { color: #94a3b8; font-size: 13px; width: 35%; }
          .value { color: #ffffff; font-size: 14px; font-weight: 600; }
          .snippet { background-color: #090d16; border-left: 4px solid #38bdf8; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #cbd5e1; white-space: pre-wrap; margin-top: 16px; }
          .footer { background-color: #090d16; padding: 16px; text-align: center; font-size: 12px; color: #64748b; }
          .btn { display: inline-block; background-color: #38bdf8; color: #0f172a; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>⚖️ EstateWatch Match Notification</h1>
            <p>Government Gazette Deceased Estate Alert System</p>
          </div>
          <div class="content">
            <div class="alert-badge">Alert Match: ${params.alertName}</div>
            <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px;">${params.estateName}</h2>
            
            <table class="grid">
              <tr>
                <td class="label">Estate Reference:</td>
                <td class="value">${params.estateNumber}</td>
              </tr>
              <tr>
                <td class="label">Jurisdiction:</td>
                <td class="value">${params.province} (${params.district})</td>
              </tr>
              <tr>
                <td class="label">Estimated Value:</td>
                <td class="value" style="color: #4ade80;">${params.valueBand}</td>
              </tr>
              <tr>
                <td class="label">Executor Name:</td>
                <td class="value">${params.executorName}</td>
              </tr>
              <tr>
                <td class="label">Executor Contact:</td>
                <td class="value">${params.executorContact} ${params.executorEmail ? '• ' + params.executorEmail : ''}</td>
              </tr>
              <tr>
                <td class="label">Source Gazette:</td>
                <td class="value">${params.gazetteRef}</td>
              </tr>
            </table>

            <div style="margin-top: 16px;">
              <strong style="color: #94a3b8; font-size: 13px;">Official Notice Excerpt:</strong>
              <div class="snippet">${params.rawSnippet}</div>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="${appUrl}" class="btn">View & Claim in EstateWatch Lead Pipeline</a>
            </div>
          </div>
          <div class="footer">
            EstateWatch • South African Deceased Estate Monitoring Platform<br/>
            POPIA Compliant • Automated Gazette Ingestion & Match Notification
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: params.to,
      subject: params.subject || `[EstateWatch Alert] Match Found: ${params.estateName} (${params.estateNumber})`,
      text: `EstateWatch Alert Match: ${params.alertName}\nDeceased: ${params.estateName}\nEstate Number: ${params.estateNumber}\nProvince: ${params.province}\nValue: ${params.valueBand}\nExecutor: ${params.executorName} (${params.executorContact})\nGazette Ref: ${params.gazetteRef}`,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`✉️ Email dispatched to ${params.to}! Message ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`🔗 Preview Email at Ethereal: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
      recipient: params.to,
    };
  } catch (error: any) {
    console.error('❌ Failed to send email alert:', error);
    return {
      success: false,
      error: error.message || 'Email dispatch failed',
    };
  }
}
