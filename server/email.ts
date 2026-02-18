import nodemailer from 'nodemailer';
import type { User } from '@shared/schema';

// Create reusable transporter
const createTransporter = () => {
  // For development, use ethereal email (fake SMTP service)
  // For production, use real SMTP credentials from environment variables
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Development fallback - console log only
  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
};

export async function sendNewUserEmail(user: User, plainPassword: string) {
  try {
    const transporter = createTransporter();

    const loginUrl = process.env.APP_URL || 'http://localhost:5000';

    const mailOptions = {
      from: process.env.SMTP_FROM || '"FLOW Support" <noreply@flow.com>',
      to: user.email,
      subject: 'Welcome to FLOW - Your Account Has Been Created',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
            }
            .credentials {
              background: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
            }
            .credentials p {
              margin: 8px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 0 0 8px 8px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            code {
              background: #f4f4f4;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Welcome to FLOW</h1>
            <p>Fleek Complaint Management Portal</p>
          </div>

          <div class="content">
            <h2>Hello ${user.name},</h2>

            <p>Your account has been successfully created in the FLOW system. You can now access the portal to manage tickets and collaborate with your team.</p>

            <div class="credentials">
              <h3>Your Login Credentials</h3>
              <p><strong>Email:</strong> <code>${user.email}</code></p>
              <p><strong>Temporary Password:</strong> <code>${plainPassword}</code></p>
              <p><strong>Role:</strong> ${user.role}</p>
              ${user.department ? `<p><strong>Department:</strong> ${user.department}</p>` : ''}
            </div>

            <p><strong>⚠️ Important Security Notice:</strong><br>
            For your security, please change your password immediately after your first login. You can update your password in the Profile section.</p>

            <div style="text-align: center;">
              <a href="${loginUrl}/login" class="button">Login to FLOW</a>
            </div>

            <h3>What's Next?</h3>
            <ul>
              <li>Login using your credentials</li>
              <li>Change your password in the Profile section</li>
              <li>Explore the dashboard and familiarize yourself with the system</li>
              <li>Start managing and collaborating on tickets</li>
            </ul>

            <p>If you have any questions or need assistance, please contact your administrator.</p>
          </div>

          <div class="footer">
            <p>This is an automated message from FLOW. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} FLOW - Fleek Complaint Management Portal</p>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to FLOW - Fleek Complaint Management Portal

Hello ${user.name},

Your account has been successfully created in the FLOW system.

Your Login Credentials:
- Email: ${user.email}
- Temporary Password: ${plainPassword}
- Role: ${user.role}
${user.department ? `- Department: ${user.department}` : ''}

IMPORTANT: For your security, please change your password immediately after your first login.

Login URL: ${loginUrl}/login

What's Next?
1. Login using your credentials
2. Change your password in the Profile section
3. Explore the dashboard and familiarize yourself with the system
4. Start managing and collaborating on tickets

If you have any questions or need assistance, please contact your administrator.

---
This is an automated message from FLOW. Please do not reply to this email.
© ${new Date().getFullYear()} FLOW - Fleek Complaint Management Portal
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // In development, log the email content
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 Email sent to:', user.email);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info) || 'N/A');
      console.log('Email content logged for development\n');
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    // Don't throw - we don't want email failures to block user creation
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendPasswordResetEmail(user: User, resetToken: string) {
  try {
    const transporter = createTransporter();

    const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"FLOW Support" <noreply@flow.com>',
      to: user.email,
      subject: 'Reset Your FLOW Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border: 1px solid #e0e0e0;
              border-top: none;
            }
            .alert-box {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 0 0 8px 8px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
            <p>FLOW - Fleek Complaint Management Portal</p>
          </div>

          <div class="content">
            <h2>Hello ${user.name},</h2>

            <p>We received a request to reset your password for your FLOW account. Click the button below to create a new password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 12px;">
              ${resetUrl}
            </p>

            <div class="alert-box">
              <p><strong>⏰ This link will expire in 1 hour.</strong></p>
              <p style="margin-bottom: 0;">For security reasons, password reset links are only valid for 1 hour after being requested.</p>
            </div>

            <p><strong>⚠️ Didn't request this?</strong><br>
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

            <p>If you continue to receive these emails without requesting them, please contact your administrator immediately.</p>
          </div>

          <div class="footer">
            <p>This is an automated message from FLOW. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} FLOW - Fleek Complaint Management Portal</p>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request - FLOW

Hello ${user.name},

We received a request to reset your password for your FLOW account.

Reset your password by visiting this link:
${resetUrl}

This link will expire in 1 hour for security reasons.

Didn't request this?
If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

If you continue to receive these emails without requesting them, please contact your administrator immediately.

---
This is an automated message from FLOW. Please do not reply to this email.
© ${new Date().getFullYear()} FLOW - Fleek Complaint Management Portal
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // In development, log the email content
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 Password reset email sent to:', user.email);
      console.log('Reset URL:', resetUrl);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info) || 'N/A');
      console.log('Email content logged for development\n');
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
