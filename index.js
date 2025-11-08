// ============================================
// Backend/index.js - FINAL JWT VERSION
// ============================================

// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import express from "express";
import passport from 'passport';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken'; // Required for signing JWTs in the Google callback

// Import passport configuration (this single import sets up all our strategies)
import './config/passport-setup.js';

// Import all application routes
import authRouter from './routes/auth.js';
import tradesRouter from './routes/trades.js';
import tradingRouter from './routes/trading.js';
import brokersRouter from './routes/brokers.js';
import portfolioRouter from './routes/portfolio.js';
import analyticsRouter from './routes/analytics.js';
import strategiesRouter from './routes/strategies.js';
import syncRouter from './routes/sync.js';
import upstoxRouter from './routes/upstox.js';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4028';

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// ===================================================
// CORS Configuration
// ===================================================
// This is configured correctly for a separate frontend that needs to send credentials (like a JWT)
const corsOptions = {
    origin: FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization', // Crucially, allow the 'Authorization' header
};
app.use(cors(corsOptions));

// ===================================================
// Middleware
// ===================================================
// Body parsing for JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve favicon
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/favicon.ico', express.static(path.join(__dirname, '../Frontend/public/favicon.ico')));

// Initialize Passport for stateless JWT authentication.
// We NO LONGER use express-session or passport.session().
app.use(passport.initialize());

// Optional: Logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ===================================================
// OAUTH ROUTES (Stateless JWT Flow)
// ===================================================
// These routes handle the initial redirect to and callback from Google.

// 1. Initiate Google OAuth
app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false // Explicitly tell passport NOT to create a session
    })
);

// 2. Google OAuth callback
app.get('/auth/google/callback',
    passport.authenticate('google', {
        session: false, // Again, no sessions
        failureRedirect: `${FRONTEND_URL}/login?error=google-auth-failed`,
    }),
    (req, res) => {
        // If this callback is reached, the user has been authenticated by Google
        // and the GoogleStrategy has found or created a user record in our database.
        // The user object is now available at `req.user`.

        // Generate a JWT for this user.
        const token = jwt.sign(
            { userId: req.user.id, email: req.user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } // Set an expiration for the token
        );

        // Redirect the user back to the frontend to a special callback URL,
        // passing the token as a query parameter.
        res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    }
);

// ===================================================
// API ROUTES (/api prefix)
// ===================================================

// Use the consolidated auth router for login, register, and /me
app.use('/api/auth', authRouter);

// Create a reusable middleware for protecting API routes.
// This will use our JwtStrategy to check for a valid 'Authorization: Bearer <token>' header.
const requireAuth = passport.authenticate('jwt', { session: false });

// Apply the 'requireAuth' middleware to all data-related API routes.
// Any request to these endpoints MUST include a valid JWT.
app.use('/api/trades', requireAuth, tradesRouter);
app.use('/api/trading', requireAuth, tradingRouter);
app.use('/api/brokers', requireAuth, brokersRouter);
app.use('/api/portfolio', requireAuth, portfolioRouter);
app.use('/api/analytics', requireAuth, analyticsRouter);
app.use('/api/strategies', requireAuth, strategiesRouter);
app.use('/api/sync', requireAuth, syncRouter);
app.use('/api/upstox', requireAuth, upstoxRouter);

// ===================================================
// ERROR HANDLING
// ===================================================

// 404 handler for any routes not matched above
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('========================================');
    console.error('❌ GLOBAL ERROR HANDLER CAUGHT AN ERROR:');
    console.error(err.stack);
    console.error('========================================');

    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
    });
});

// ===================================================
// START SERVER
// ===================================================

app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`🔐 Authentication Strategy: Stateless JWT`);
    console.log('=================================');
    console.log('API Endpoints:');
    console.log('  POST /api/auth/register');
    console.log('  POST /api/auth/login');
    console.log('  GET  /api/auth/me (Protected)');
    console.log('  GET  /auth/google (OAuth Start)');
    console.log('=================================');
});