import nodemailer from 'nodemailer';

export interface LoginSecurityDetails {
  date: string;
  time: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
}

export interface PasswordSecurityDetails {
  date: string;
  time: string;
  device: string;
  browser: string;
  ipAddress: string;
}

// Create Nodemailer Transporter if SMTP environment variables are present
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
}

/**
 * Send Security Alert Email (Asynchronous & Failure-Safe)
 */
async function dispatchEmail(to: string, subject: string, htmlContent: string) {
  const from = process.env.EMAIL_FROM || 'CortexCode Security <security@cortexcode.ai>';

  try {
    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from,
        to,
        subject,
        html: htmlContent
      });
      console.log(`[EmailService] Security notification successfully sent to ${to}`);
      return { success: true, mode: 'SMTP' };
    }

    // Fallback: Resend HTTP API if configured
    const resendKey = process.env.EMAIL_PROVIDER_API_KEY || process.env.RESEND_API_KEY;
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({ from, to: [to], subject, html: htmlContent })
      });
      if (res.ok) {
        console.log(`[EmailService] Resend email dispatched to ${to}`);
        return { success: true, mode: 'Resend' };
      }
    }

    // Unconfigured Fallback Logging (does not throw error)
    console.log(`[EmailService] (Local Logger - Credentials unconfigured) Dispatched to ${to}: ${subject}`);
    return { success: true, mode: 'LocalLogger' };
  } catch (error: any) {
    console.error(`[EmailService Error] Failed to send email to ${to}:`, error.message || error);
    return { success: false, error: error.message };
  }
}

/**
 * 1. LOGIN ALERT
 * Sent to the authenticated user's registered email AFTER successful login
 */
export async function sendLoginAlert(
  user: { email: string; name: string },
  details: LoginSecurityDetails
) {
  if (!user || !user.email) return;

  const subject = 'New login detected — CortexCode';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f5; margin: 0; padding: 24px; }
        .container { max-width: 540px; margin: 0 auto; background-color: #121212; border: 1px solid #262626; border-radius: 8px; overflow: hidden; }
        .header { padding: 20px 24px; border-bottom: 1px solid #262626; font-weight: bold; font-size: 16px; color: #ffffff; letter-spacing: -0.02em; }
        .content { padding: 24px; font-size: 13px; line-height: 1.6; color: #a1a1aa; }
        .details-box { background-color: #171717; border: 1px solid #262626; border-radius: 6px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #f5f5f5; }
        .details-row { margin-bottom: 6px; }
        .details-row:last-child { margin-bottom: 0; }
        .label { color: #71717a; display: inline-block; width: 120px; }
        .action-btn { display: inline-block; margin-top: 16px; padding: 10px 18px; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; border-radius: 6px; }
        .footer { padding: 16px 24px; border-top: 1px solid #262626; font-size: 11px; color: #71717a; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">CORTEXCODE SECURITY</div>
        <div class="content">
          <p style="color: #ffffff; font-weight: 600; margin-top: 0;">Hello ${user.name},</p>
          <p>A new login to your CortexCode account was detected.</p>
          
          <div class="details-box">
            <div class="details-row"><span class="label">Date:</span> ${details.date}</div>
            <div class="details-row"><span class="label">Time:</span> ${details.time}</div>
            <div class="details-row"><span class="label">Device:</span> ${details.device}</div>
            <div class="details-row"><span class="label">Browser:</span> ${details.browser}</div>
            <div class="details-row"><span class="label">OS:</span> ${details.os}</div>
            <div class="details-row"><span class="label">IP Address:</span> ${details.ipAddress}</div>
            <div class="details-row"><span class="label">Location:</span> ${details.location}</div>
          </div>

          <p>If this was you, no action is required.</p>
          <p style="color: #ef4444;">If you do not recognize this activity, secure your account immediately by changing your password and reviewing your active sessions.</p>

          <a href="https://cortexcode.ai/workspace/brain" class="action-btn">Review Security Activity</a>
        </div>
        <div class="footer">
          CortexCode Security Team &bull; Automated System Notification
        </div>
      </div>
    </body>
    </html>
  `;

  // Asynchronous non-blocking dispatch
  dispatchEmail(user.email, subject, html).catch(() => {});
}

/**
 * 2. PASSWORD CHANGE ALERT
 * Sent to the authenticated user's registered email AFTER successful password change
 */
export async function sendPasswordChangeAlert(
  user: { email: string; name: string },
  details: PasswordSecurityDetails
) {
  if (!user || !user.email) return;

  const subject = 'Your CortexCode password was changed';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #f5f5f5; margin: 0; padding: 24px; }
        .container { max-width: 540px; margin: 0 auto; background-color: #121212; border: 1px solid #262626; border-radius: 8px; overflow: hidden; }
        .header { padding: 20px 24px; border-bottom: 1px solid #262626; font-weight: bold; font-size: 16px; color: #ffffff; letter-spacing: -0.02em; }
        .content { padding: 24px; font-size: 13px; line-height: 1.6; color: #a1a1aa; }
        .details-box { background-color: #171717; border: 1px solid #262626; border-radius: 6px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #f5f5f5; }
        .details-row { margin-bottom: 6px; }
        .details-row:last-child { margin-bottom: 0; }
        .label { color: #71717a; display: inline-block; width: 120px; }
        .action-btn { display: inline-block; margin-top: 16px; padding: 10px 18px; background-color: #ef4444; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600; border-radius: 6px; }
        .footer { padding: 16px 24px; border-top: 1px solid #262626; font-size: 11px; color: #71717a; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">CORTEXCODE SECURITY</div>
        <div class="content">
          <p style="color: #ffffff; font-weight: 600; margin-top: 0;">Hello ${user.name},</p>
          <p>Your CortexCode account password was successfully changed.</p>
          
          <div class="details-box">
            <div class="details-row"><span class="label">Date:</span> ${details.date}</div>
            <div class="details-row"><span class="label">Time:</span> ${details.time}</div>
            <div class="details-row"><span class="label">Device:</span> ${details.device}</div>
            <div class="details-row"><span class="label">Browser:</span> ${details.browser}</div>
            <div class="details-row"><span class="label">IP Address:</span> ${details.ipAddress}</div>
          </div>

          <p>If you made this change, no further action is required.</p>
          <p style="color: #ef4444; font-weight: 600;">If you did NOT change your password, secure your account immediately.</p>

          <a href="https://cortexcode.ai/workspace/brain" class="action-btn">Secure Account</a>
        </div>
        <div class="footer">
          CortexCode Security Team &bull; Automated Security Notification
        </div>
      </div>
    </body>
    </html>
  `;

  // Asynchronous non-blocking dispatch
  dispatchEmail(user.email, subject, html).catch(() => {});
}
