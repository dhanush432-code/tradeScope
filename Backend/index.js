const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
require('dotenv').config({ path: './.env' });

// Import passport configuration
require('./config/passport-setup');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4028';

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
// AUTHENTICATION ROUTES
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
// Get current user
app.get('/api/user/me', (req, res) => {
    console.log('GET /api/user/me', req.user ? `User: ${req.user.email}` : 'No user');
    
    if (req.user) {
        return res.status(200).json(req.user);
    }
    res.status(401).json({ message: 'Unauthorized' });
});

// Logout
app.post('/auth/logout', (req, res, next) => {
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

// ===================================================
// API ROUTES
// ===================================================

app.use('/api/trades', require('./routes/trades'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/brokers', require('./routes/brokers'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/strategies', require('./routes/strategies'));
app.use('/api/sync', require('./routes/sync'));

// ===================================================
// ERROR HANDLING
// ===================================================

// 404 handler
app.use((req, res) => {
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
    console.log('=================================');

    console.log('=================================');
console.log('🔍 Environment Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Set' : '❌ Missing');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('=================================');
});