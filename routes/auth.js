// File: routes/auth.js

import express from 'express';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// Helper function to create a JWT
const generateToken = (user) => {
    return jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET, // Make sure JWT_SECRET is in your .env file!
        { expiresIn: '7d' }
    );
};

// ===================================
//  1. REGISTER A NEW USER
// ===================================
router.post('/register', async (req, res) => {
  try {
    // 1. Get all data from the form
    const {
      fullName,
      email,
      password,
      experienceLevel,
      assetClasses,
      baseCurrency,
      emailMarketing,
    } = req.body;

    // 2. Basic validation (for a real app, use a library like Zod or Joi)
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email, and password are required.' });
    }

    // 3. Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // 4. Hash the password for security
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 5. Create the new user and their profile in a single database transaction
    const newUser = await prisma.user.create({
      data: {
        display_name: fullName,
        email: email.toLowerCase(),
        hashed_password: hashedPassword,
        provider: 'local', // Signifies they used your form
        profile: {
          create: {
            experience_level: experienceLevel,
            asset_classes: assetClasses,
            base_currency: baseCurrency,
            email_marketing: emailMarketing,
          },
        },
      },
      // Select which user fields to return (never return the password)
      select: {
        id: true,
        email: true,
        display_name: true,
        provider: true
      }
    });

    // 6. Create a JWT to log the user in immediately after registration
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET, // Make sure you have a JWT_SECRET in your .env file!
      { expiresIn: '7d' } // Token expires in 7 days
    );

    // 7. Send the successful response
    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: newUser,
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'An internal server error occurred during registration.' });
  }
});


// ===================================
//  2. LOG IN AN EXISTING USER
// ===================================
// We use passport.authenticate('local') to verify email/password.
// If it succeeds, the code inside the (req, res) => {} block runs.
router.post('/login', passport.authenticate('local', { session: false }), (req, res) => {
    // If we get here, authentication was successful. `req.user` is the user object.
    const token = generateToken(req.user);
    const user = { id: req.user.id, email: req.user.email, display_name: req.user.display_name };
    res.status(200).json({ token, user });
});

// ===================================
//  3. GET CURRENT USER (PROTECTED)
// ===================================
// This is a protected route. Only requests with a valid JWT can access it.
// passport.authenticate('jwt') is the middleware that checks the token.
router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
    // If the token was valid, `req.user` is populated by the JwtStrategy.
    res.status(200).json({ user: req.user });
});

export default router;