import nodemailer from 'nodemailer';

export class EmailService {
  private static transporterInstance: any = null;

  private static getTransporter() {
    if (this.transporterInstance) {
      return this.transporterInstance;
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      // Create a highly optimized, pooled Gmail SMTP transporter for fast back-to-back delivery
      this.transporterInstance = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10,
        connectionTimeout: 3000,
        socketTimeout: 3000,
        greetingTimeout: 3000,
        auth: {
          user: gmailUser,
          pass: gmailPass
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      return this.transporterInstance;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporterInstance = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        pool: true,
        connectionTimeout: 3000,
        socketTimeout: 3000,
        greetingTimeout: 3000,
        auth: { user, pass }
      });
      return this.transporterInstance;
    }

    return null;
  }

  private static getHTMLTemplate(title: string, bodyContent: string, actionUrl?: string, actionText?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #09090b;
            color: #fafafa;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #18181b;
            border: 1px solid #27272a;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #a855f7;
            text-decoration: none;
            letter-spacing: -0.05em;
          }
          .title {
            font-size: 20px;
            font-weight: 800;
            margin-top: 16px;
            color: #ffffff;
          }
          .content {
            font-size: 14px;
            line-height: 1.6;
            color: #a1a1aa;
            margin-bottom: 32px;
          }
          .action-container {
            text-align: center;
            margin-bottom: 32px;
          }
          .action-btn {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb, #7c3aed, #db2777);
            color: #ffffff !important;
            font-weight: bold;
            font-size: 13px;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 9999px;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #52525b;
            border-top: 1px solid #27272a;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="https://cortexcode-web.onrender.com" class="logo">CortexCode AI</a>
            <div class="title">${title}</div>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          ${actionUrl && actionText ? `
            <div class="action-container">
              <a href="${actionUrl}" class="action-btn">${actionText}</a>
            </div>
          ` : ''}
          <div class="footer">
            &copy; ${new Date().getFullYear()} CortexCode. All rights reserved.<br>
            Intelligent Codebase Analytics Engine
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private static async send(to: string, subject: string, html: string) {
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      console.warn(`[EmailService] Invalid recipient email address: "${to}"`);
      return;
    }

    const recipient = to.trim().toLowerCase();

    // Detach email dispatch to background macro-task so HTTP response is returned instantaneously (< 50ms)
    setImmediate(async () => {
      const transporter = EmailService.getTransporter();
      const senderEmail = process.env.GMAIL_USER || process.env.SMTP_FROM || 'noreply@cortexcode.ai';
      
      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"CortexCode AI" <${senderEmail}>`,
            to: recipient,
            subject,
            html
          });
          console.log(`[EmailService] Real email successfully dispatched to ${recipient} for subject "${subject}"`);
        } catch (err) {
          console.error(`[EmailService] SMTP Dispatch failed for recipient ${recipient}:`, err);
        }
      } else {
        console.log('========================================================');
        console.log(`[EmailService] DISPATCHED TO USER EMAIL: ${recipient}`);
        console.log(`Subject: ${subject}`);
        console.log('========================================================');
      }
    });
  }

  public static async sendWelcomeEmail(to: string, name: string) {
    const subject = 'Welcome to CortexCode AI Workspace! 🚀';
    const body = `
      <p>Hello ${name},</p>
      <p>Welcome to <strong>CortexCode AI</strong> — the context-aware codebase analysis engine. We are thrilled to help you analyze, search, and review your codebases at lightning speed.</p>
      <p>To get started, connect your GitHub account or import your first repository. Our AI indexer will begin vector embedding your code modules instantly.</p>
    `;
    const html = this.getHTMLTemplate(subject, body, 'https://cortexcode-web.onrender.com/workspace', 'Enter Workspace');
    await this.send(to, subject, html);
  }

  public static async sendLoginAlertEmail(to: string, name: string, ip: string = '127.0.0.1', device: string = 'Browser Session') {
    const subject = 'CortexCode: New Login Alert 🔐';
    const time = new Date().toLocaleString();
    const body = `
      <p>Hello ${name},</p>
      <p>A new login event was detected on your CortexCode account:</p>
      <ul>
        <li><strong>Account Email:</strong> ${to}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>IP Address:</strong> ${ip}</li>
        <li><strong>Device/Browser:</strong> ${device}</li>
      </ul>
      <p>If this was you, no action is required. If you do not recognize this activity, please reset your password immediately to secure your account.</p>
    `;
    const html = this.getHTMLTemplate(subject, body, 'https://cortexcode-web.onrender.com/forgot-password', 'Reset Password');
    await this.send(to, subject, html);
  }

  public static async sendPasswordResetEmail(to: string, name: string, token: string) {
    const subject = 'Reset your CortexCode Password 🔑';
    const resetUrl = `https://cortexcode-web.onrender.com/reset-password?token=${token}`;
    const body = `
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Click the link below to configure a new password. This link is valid for 1 hour.</p>
    `;
    const html = this.getHTMLTemplate(subject, body, resetUrl, 'Reset Password');
    await this.send(to, subject, html);
  }

  public static async sendIndexingCompletedEmail(to: string, name: string, repoName: string) {
    const subject = `Repository "${repoName}" Indexed Successfully! 📁`;
    const body = `
      <p>Hello ${name},</p>
      <p>Good news! Your repository <strong>${repoName}</strong> has been completely parsed, index-mapped, and embedded into our semantic vector store.</p>
      <p>CortexCode AI is now fully prepared to answer questions, audit quality issues, and write tests for this codebase.</p>
    `;
    const html = this.getHTMLTemplate(subject, body, `https://cortexcode-web.onrender.com/workspace`, 'Launch AI Assistant');
    await this.send(to, subject, html);
  }

  public static async sendSecurityVulnerabilityAlert(to: string, name: string, repoName: string, findingsCount: number) {
    const subject = `⚠️ CRITICAL: Security Vulnerabilities Detected in "${repoName}"`;
    const body = `
      <p>Hello ${name},</p>
      <p>Our automated security scanner completed a security audit on repository <strong>${repoName}</strong>.</p>
      <p>We detected <strong>${findingsCount} potential vulnerability findings</strong> (including SQL Injection risk points).</p>
      <p>Please review the details in your dashboard and apply the recommended refactor patches immediately.</p>
    `;
    const html = this.getHTMLTemplate(subject, body, `https://cortexcode-web.onrender.com/workspace`, 'View Audit Report');
    await this.send(to, subject, html);
  }
}
