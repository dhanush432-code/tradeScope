const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
require('dotenv').config({ path: './.env' }); // Load env variables

// Import the Passport setup file you provided
require('./config/passport-setup'); 

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
// Crucial: This must allow your frontend origin (e.g., http://localhost:5173 for Vite dev server)
// and allow credentials (cookies) to be sent and received.
const FRONTEND_URL = 'http://localhost:4028'; // Assuming default Vite dev port

const corsOptions = {
    origin: FRONTEND_URL, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies (sessions) to be sent
    allowedHeaders: 'Content-Type, Authorization',
};

app.use(cors(corsOptions));

// --- Session Middleware Setup ---
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something is stored
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        // secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        // If frontend and backend are on different ports/domains, you might need:
        // sameSite: 'lax', 
    }
}));

// --- Passport Initialization ---
app.use(passport.initialize());
app.use(passport.session()); // Enable session support for Passport

// ===================================================
// 1. Authentication Routes (OAuth Flow)
// ===================================================

// A. Initiate Google Login
app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'] // Request access to profile and email
    })
);

// B. Google Callback (Matches CALLBACK_URL in .env)
app.get(process.env.CALLBACK_URL, // This resolves to /auth/google/callback
    passport.authenticate('google', {
        // Redirect back to the frontend on failure
        failureRedirect: `${FRONTEND_URL}/auth/callback?status=failure`
    }),
    // On successful authentication (session cookie is set)
    (req, res) => {
        // Redirect back to the frontend on success
        res.redirect(`${FRONTEND_URL}/auth/callback?status=success`);
    }
);

// ===================================================
// 2. Session Management / User Data Routes
// ===================================================

// C. Get Current User (Used by AuthContext to check session)
app.get('/api/user/me', (req, res) => {
    // req.user is populated by passport.session() if a valid session exists
    if (req.user) {
        // Return the user data stored in the session
        return res.status(200).json(req.user);
    }
    // If not authenticated
    res.status(401).json({ message: 'Unauthorized' });
});

// D. Logout Route
app.post('/auth/logout', (req, res, next) => {
    // Passport logout method (requires Express 4.17.6+)
    req.logout((err) => {
        if (err) { return next(err); }
        // Clear the session cookie
        req.session.destroy(() => {
            res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
});