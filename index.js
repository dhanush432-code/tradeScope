// ============================================
// Backend/index.js
// ============================================

import express from "express";
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

// Import passport configuration
import './config/passport-setup.js';

// Import routes
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
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://traddepad.netlify.app';

// CORS Configuration
const corsOptions = {
    origin: FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax'
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.user ? `User: ${req.user.email}` : 'Not authenticated');
    next();
});

// ===================================================
// AUTHENTICATION ROUTES (OAuth flow - no /api prefix)
// ===================================================

// Initiate Google OAuth
app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })
);

// Google OAuth callback
app.get('/auth/google/callback',
    (req, res, next) => {
        console.log('📍 Callback route hit');
        console.log('Query params:', req.query);
        next();
    },
    passport.authenticate('google', {
        failureRedirect: `${FRONTEND_URL}/auth/callback?status=failure`,
        failureMessage: true
    }),
    (req, res) => {
        console.log('✅ Authentication successful');
        console.log('User:', req.user);
        console.log('Session:', req.session);
        res.redirect(`${FRONTEND_URL}/auth/callback?status=success`);
    }
);

// ===================================================
// API ROUTES (with /api prefix)
// ===================================================

// Auth API endpoints (these go under /api)
app.get('/api/auth/me', (req, res) => {
    console.log('GET /api/auth/me', req.user ? `User: ${req.user.email}` : 'No user');
    
    if (req.user) {
        return res.status(200).json(req.user);
    }
    res.status(401).json({ message: 'Unauthorized' });
});

app.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { 
            console.error('Logout error:', err);
            return next(err); 
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});

// Other API routes
app.use('/api/trades', tradesRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/brokers', brokersRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/strategies', strategiesRouter);
app.use('/api/sync', syncRouter);
app.use('/api/upstox', upstoxRouter);


// ===================================================
// ERROR HANDLING
// ===================================================

// 404 handler
app.use((req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.path);
    res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('========================================');
    console.error('❌ EXPRESS ERROR HANDLER:');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('========================================');
    
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ===================================================
// START SERVER
// ===================================================

app.listen(PORT, () => {
    console.log('=================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🔐 Google OAuth: /auth/google`);
    console.log(`📡 API Base: /api`);
    console.log('=================================');
    console.log('📍 Available Routes:');
    console.log('   /auth/google (OAuth initiate)');
    console.log('   /auth/google/callback (OAuth callback)');
    console.log('   /api/auth/me (Get current user)');
    console.log('   /api/auth/logout (Logout)');
    console.log('=================================');

    console.log('=================================');
    console.log('🔍 Environment Check:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('=================================');
});