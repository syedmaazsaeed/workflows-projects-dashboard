import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    // Initialize asynchronously - don't await to avoid blocking constructor
    this.initializeTransporter().catch((error) => {
      this.logger.error('Failed to initialize email transporter in constructor', error);
    });
  }

  private async initializeTransporter() {
    // Check EMAIL_ENABLED from environment (supports both 'true' string and boolean)
    const emailEnabled = this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true' || 
                         this.configService.get<boolean>('EMAIL_ENABLED', false);
    
    if (!emailEnabled) {
      this.logger.log('Email service is disabled. Verification codes will be logged to console.');
      this.logger.log('To enable emails, set EMAIL_ENABLED=true in your .env file');
      return;
    }

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD');
    const smtpSecure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true' ||
                       this.configService.get<boolean>('SMTP_SECURE', false);
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || smtpUser;

    // Check for placeholder values
    const isPlaceholder = !smtpHost || 
                          !smtpUser || 
                          !smtpPassword ||
                          smtpUser.includes('your-email') ||
                          smtpUser.includes('@example.com') ||
                          smtpPassword.includes('your-app-password') ||
                          smtpPassword.includes('your-password') ||
                          smtpPassword.length < 10; // App passwords are usually 16 characters

    if (isPlaceholder) {
      this.logger.warn('⚠️  Email configuration incomplete or contains placeholders.');
      this.logger.warn(`   SMTP_HOST: ${smtpHost || 'NOT SET'}`);
      this.logger.warn(`   SMTP_USER: ${smtpUser || 'NOT SET'}`);
      this.logger.warn(`   SMTP_PASSWORD: ${smtpPassword ? (smtpPassword.length < 10 ? 'TOO SHORT (likely placeholder)' : 'SET') : 'NOT SET'}`);
      this.logger.warn('   Please update SMTP_USER and SMTP_PASSWORD in your .env file');
      this.logger.warn('   For Gmail, use an App Password (not your regular password)');
      this.logger.warn('   Email service will log to console until configured.');
      return;
    }

    try {
      // Gmail-specific configuration
      const isGmail = smtpHost?.includes('gmail.com');
      const transporterConfig: any = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      };

      // Add Gmail-specific options
      if (isGmail) {
        transporterConfig.service = 'gmail';
        // Gmail requires TLS/STARTTLS
        transporterConfig.requireTLS = true;
        transporterConfig.tls = {
          rejectUnauthorized: false, // For development, set to true in production
        };
      }

      this.transporter = nodemailer.createTransport(transporterConfig);

      // Verify connection
      this.logger.log('Verifying email connection...');
      await this.transporter.verify();
      this.logger.log('✅ Email service initialized and verified successfully');
      this.logger.log(`   SMTP Server: ${smtpHost}:${smtpPort}`);
      this.logger.log(`   From: ${smtpFrom}`);
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize email transporter', error);
      if (error.code === 'EAUTH') {
        this.logger.error('   Authentication failed. Please check:');
        this.logger.error('   1. Your Gmail account email is correct');
        this.logger.error('   2. You are using an App Password (not your regular password)');
        this.logger.error('   3. 2-Step Verification is enabled on your Google account');
        this.logger.error('   4. The App Password was generated correctly');
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        this.logger.error('   Connection failed. Please check:');
        this.logger.error('   1. Your internet connection');
        this.logger.error('   2. SMTP_HOST and SMTP_PORT are correct');
        this.logger.error('   3. Firewall is not blocking the connection');
      } else {
        this.logger.error(`   Error: ${error.message || error}`);
      }
      this.transporter = null;
    }
  }

  async sendVerificationCode(email: string, code: string, name: string): Promise<void> {
    // Check EMAIL_ENABLED from environment (supports both 'true' string and boolean)
    const emailEnabled = this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true' || 
                         this.configService.get<boolean>('EMAIL_ENABLED', false);
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER') || 'noreply@automationhub.com';
    
    this.logger.log(`Attempting to send verification code to ${email}`);
    this.logger.debug(`EMAIL_ENABLED: ${emailEnabled}, transporter: ${this.transporter ? 'exists' : 'null'}`);
    
    // If transporter is null, try to reinitialize (in case env was updated)
    if (emailEnabled && !this.transporter) {
      this.logger.warn('Transporter is null but EMAIL_ENABLED=true. Attempting to reinitialize...');
      await this.initializeTransporter();
    }
    
    if (emailEnabled && this.transporter) {
      try {
        const result = await this.transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: 'Verify your Automation Hub account',
          html: this.getVerificationEmailTemplate(name, code),
        });
        this.logger.log(`✅ Verification email sent successfully to ${email}`);
        this.logger.debug(`Message ID: ${result.messageId}`);
      } catch (error: any) {
        this.logger.error(`❌ Failed to send verification email to ${email}`);
        this.logger.error(`Error details: ${error.message || error}`);
        if (error.code === 'EAUTH') {
          this.logger.error('Authentication error - please verify your Gmail App Password');
        } else if (error.code === 'ECONNECTION') {
          this.logger.error('Connection error - please check your SMTP settings');
        }
        // Fallback to console logging if email fails
        this.logger.warn('Falling back to console logging...');
        this.logVerificationCode(email, code, name);
        throw new Error(`Failed to send verification email: ${error.message || 'Unknown error'}. Please check your email configuration.`);
      }
    } else {
      // Development mode: log to console
      if (!emailEnabled) {
        this.logger.warn('EMAIL_ENABLED is false - logging to console instead');
      } else if (!this.transporter) {
        this.logger.warn('Email transporter not initialized - logging to console instead');
      }
      this.logVerificationCode(email, code, name);
    }
  }

  private logVerificationCode(email: string, code: string, name: string): void {
    console.log('\n' + '='.repeat(60));
    console.log('📧 EMAIL VERIFICATION CODE');
    console.log(`To: ${email}`);
    console.log(`Name: ${name}`);
    console.log(`Verification Code: ${code}`);
    console.log(`Expires in: 15 minutes`);
    console.log('='.repeat(60) + '\n');
    
    // Also use logger for consistency
    this.logger.log('='.repeat(60));
    this.logger.log(`📧 EMAIL VERIFICATION CODE`);
    this.logger.log(`To: ${email}`);
    this.logger.log(`Name: ${name}`);
    this.logger.log(`Verification Code: ${code}`);
    this.logger.log(`Expires in: 15 minutes`);
    this.logger.log('='.repeat(60));
  }

  async sendApprovalNotification(email: string, name: string, approved: boolean): Promise<void> {
    // Check EMAIL_ENABLED from environment (supports both 'true' string and boolean)
    const emailEnabled = this.configService.get<string>('EMAIL_ENABLED', 'false') === 'true' || 
                         this.configService.get<boolean>('EMAIL_ENABLED', false);
    const smtpFrom = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER') || 'noreply@automationhub.com';
    
    if (emailEnabled && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: approved ? 'Your Automation Hub account has been approved' : 'Your Automation Hub account registration',
          html: this.getApprovalEmailTemplate(name, approved),
        });
        this.logger.log(`✅ Approval notification sent to ${email}`);
      } catch (error) {
        this.logger.error(`❌ Failed to send approval notification to ${email}`, error);
        // Fallback to console logging if email fails
        this.logApprovalNotification(email, name, approved);
      }
    } else {
      // Development mode: log to console
      this.logApprovalNotification(email, name, approved);
    }
  }

  private logApprovalNotification(email: string, name: string, approved: boolean): void {
    this.logger.log('='.repeat(60));
    this.logger.log(`📧 ACCOUNT ${approved ? 'APPROVED' : 'REJECTED'}`);
    this.logger.log(`To: ${email}`);
    this.logger.log(`Name: ${name}`);
    this.logger.log(`Status: ${approved ? 'Your account has been approved. You can now log in.' : 'Your account registration has been rejected.'}`);
    this.logger.log('='.repeat(60));
  }

  private getApprovalEmailTemplate(name: string, approved: boolean): string {
    if (approved) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .success { background: #10b981; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Approved</h1>
            <p>Hi ${name},</p>
            <p>Great news! Your Automation Hub account has been approved by an administrator.</p>
            <div class="success">
              <h2>✓ You can now log in!</h2>
            </div>
            <p>You can now access all features of Automation Hub. Click the link below to sign in:</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign In</a></p>
            <div class="footer">
              <p>Best regards,<br>The Automation Hub Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .error { background: #ef4444; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Registration Status</h1>
            <p>Hi ${name},</p>
            <p>We regret to inform you that your Automation Hub account registration has been rejected.</p>
            <div class="error">
              <h2>✗ Registration Rejected</h2>
            </div>
            <p>If you believe this is an error, please contact the administrator.</p>
            <div class="footer">
              <p>Best regards,<br>The Automation Hub Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }
  }

  private getVerificationEmailTemplate(name: string, code: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code { font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 4px; text-align: center; padding: 20px; background: #f3f4f6; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Verify Your Email Address</h1>
          <p>Hi ${name},</p>
          <p>Thank you for registering with Automation Hub! Please use the verification code below to verify your email address:</p>
          <div class="code">${code}</div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <div class="footer">
            <p>Best regards,<br>The Automation Hub Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

