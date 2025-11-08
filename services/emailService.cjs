// File: services/emailService.js
// Email service for sending OTPs and other emails

const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter configuration error:', error);
  } else {
    console.log('Email transporter is ready to send emails');
  }
});

class EmailService {
  // Send OTP email
  static async sendOTPEmail(email, otp) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset OTP</h2>
            <p>Hello,</p>
            <p>You have requested to reset your password. Please use the following OTP code to proceed:</p>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0; color: #333; font-size: 24px;">${otp}</h3>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you did not request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully:', info.messageId);
      
      return { success: true, message: 'OTP email sent successfully' };
    } catch (error) {
      console.error('Email Service Error:', error);
      return { success: false, message: 'Failed to send OTP email' };
    }
  }
  
  // Send 2FA enabled notification
  static async send2FAEnabledEmail(email) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '2FA Enabled on Your Account',
        text: 'Two-factor authentication has been enabled on your account. If you did not make this change, please contact support immediately.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">2FA Enabled</h2>
            <p>Hello,</p>
            <p>Two-factor authentication has been <strong style="color: #28a745;">enabled</strong> on your account.</p>
            <p>If you did not make this change, please contact support immediately.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('2FA enabled email sent successfully:', info.messageId);
      
      return { success: true, message: '2FA enabled email sent successfully' };
    } catch (error) {
      console.error('Email Service Error:', error);
      return { success: false, message: 'Failed to send 2FA enabled email' };
    }
  }
  
  // Send 2FA disabled notification
  static async send2FADisabledEmail(email) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: '2FA Disabled on Your Account',
        text: 'Two-factor authentication has been disabled on your account. If you did not make this change, please contact support immediately.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">2FA Disabled</h2>
            <p>Hello,</p>
            <p>Two-factor authentication has been <strong style="color: #dc3545;">disabled</strong> on your account.</p>
            <p>If you did not make this change, please contact support immediately.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('2FA disabled email sent successfully:', info.messageId);
      
      return { success: true, message: '2FA disabled email sent successfully' };
    } catch (error) {
      console.error('Email Service Error:', error);
      return { success: false, message: 'Failed to send 2FA disabled email' };
    }
  }
}

module.exports = EmailService;