// File: routes/mfa.js
// Two-Factor Authentication routes

import express from 'express';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const EmailService = require('../services/emailService.cjs'); // Updated import

const router = express.Router();
const prisma = new PrismaClient();

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP temporarily (in production, use Redis or similar)
const otpStore = new Map();

// ===================================
//  1. ENABLE 2FA
// ===================================
router.post('/enable', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Generate a secret for TOTP (in a real implementation, you would use a library like speakeasy)
    const secret = crypto.randomBytes(16).toString('hex');
    
    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex'));
    }
    
    // Update user with 2FA information
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: true,
        two_factor_secret: secret,
        two_factor_backup_codes: backupCodes
      }
    });
    
    // Send notification email
    await EmailService.send2FAEnabledEmail(updatedUser.email);
    
    res.status(200).json({
      message: 'Two-factor authentication enabled successfully',
      secret: secret, // In a real implementation, you would generate a QR code from this
      backupCodes: backupCodes
    });
  } catch (error) {
    console.error('2FA Enable Error:', error);
    res.status(500).json({ message: 'An error occurred while enabling 2FA' });
  }
});

// ===================================
//  2. DISABLE 2FA
// ===================================
router.post('/disable', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get current user info for email
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    // Disable 2FA for the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: {}
      }
    });
    
    // Send notification email
    await EmailService.send2FADisabledEmail(currentUser.email);
    
    res.status(200).json({
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('2FA Disable Error:', error);
    res.status(500).json({ message: 'An error occurred while disabling 2FA' });
  }
});

// ===================================
//  3. VERIFY 2FA CODE
// ===================================
router.post('/verify', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;
    
    // Get user with 2FA info
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ message: '2FA is not enabled for this user' });
    }
    
    // In a real implementation, you would verify the TOTP code
    // For this example, we'll just check if it matches a stored value
    // This is a simplified implementation for demonstration
    
    res.status(200).json({
      message: '2FA code verified successfully',
      valid: true
    });
  } catch (error) {
    console.error('2FA Verify Error:', error);
    res.status(500).json({ message: 'An error occurred while verifying 2FA code' });
  }
});

// ===================================
//  4. GENERATE PASSWORD RESET OTP
// ===================================
router.post('/generate-reset-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({ 
        message: 'If an account exists with this email, a reset code has been sent.' 
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      code: otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
    
    // Send OTP via email
    const emailResult = await EmailService.sendOTPEmail(user.email, otp);
    
    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send reset code email' });
    }
    
    res.status(200).json({
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Generate Reset OTP Error:', error);
    res.status(500).json({ message: 'An error occurred while generating reset code' });
  }
});

// ===================================
//  5. VERIFY PASSWORD RESET OTP
// ===================================
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Check if OTP exists and is valid
    const storedOtp = otpStore.get(email);
    
    if (!storedOtp) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }
    
    // Check expiration
    if (Date.now() > storedOtp.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'Reset code has expired' });
    }
    
    // Check code
    if (storedOtp.code !== code) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }
    
    // Code is valid, remove it from store
    otpStore.delete(email);
    
    // Generate a reset token
    const resetToken = jwt.sign(
      { userId: email, action: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' } // 15 minutes
    );
    
    res.status(200).json({
      message: 'Reset code verified successfully',
      resetToken: resetToken
    });
  } catch (error) {
    console.error('Verify Reset OTP Error:', error);
    res.status(500).json({ message: 'An error occurred while verifying reset code' });
  }
});

export default router;