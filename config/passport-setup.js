// File: config/passport-setup.js

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'; // <-- For protecting routes
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// It's best practice to load this once in your main index.js, but here is fine too.
dotenv.config();

const prisma = new PrismaClient();

// Test database connection
prisma.$connect()
    .then(() => console.log('✅ Prisma connected to database'))
    .catch(err => console.error('❌ Prisma connection failed:', err.message));


// ===================================================
// 1. LOCAL STRATEGY (For Email/Password Login)
// ===================================================
// This strategy is ONLY used for the POST /api/auth/login route.
passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            // Use Prisma Client for type safety and clarity
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() }
            });

            // If user doesn't exist or signed up with Google (no password), fail.
            if (!user || !user.hashed_password) {
                return done(null, false, { message: "Invalid email or password." });
            }

            const isMatch = await bcrypt.compare(password, user.hashed_password);

            if (!isMatch) {
                return done(null, false, { message: "Invalid email or password." });
            }

            // Success! Return the user object.
            return done(null, user);

        } catch (err) {
            return done(err);
        }
    })
);

// ===================================================
// 2. GOOGLE OAUTH STRATEGY
// ===================================================
// This is used ONLY for the /auth/google and /auth/google/callback routes.
passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL || '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            const googleIdFromProfile = profile.id; // Get the ID from Google

            if (!email || !googleIdFromProfile) {
                return done(new Error('Google profile is missing email or ID.'), false);
            }

            // Find user by their unique Google ID.
            // This now uses `google_id` to match your schema.
            let user = await prisma.user.findUnique({
                where: {
                    google_id: googleIdFromProfile // CHANGED from provider_id
                }
            });

            if (user) {
                // User already exists, proceed.
                console.log('✅ Existing Google user found:', user.email);
                return done(null, user);
            }

            // User with this Google ID doesn't exist.
            // Check if an account with that email exists from a different provider (e.g., local).
            const existingUserByEmail = await prisma.user.findUnique({ where: { email } });

            if (existingUserByEmail) {
                // Account with this email exists. Link the accounts by adding the google_id.
                console.log('🔗 Linking Google account to existing local user:', email);
                const updatedUser = await prisma.user.update({
                    where: { email },
                    data: {
                        provider: 'google',
                        google_id: googleIdFromProfile, // CHANGED from provider_id
                        avatar_url: profile.photos?.[0]?.value,
                    }
                });
                return done(null, updatedUser);
            }

            // No user found at all, create a new one.
            console.log('👤 Creating new user via Google OAuth:', email);
            const newUser = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    display_name: profile.displayName,
                    avatar_url: profile.photos?.[0]?.value,
                    provider: 'google',
                    google_id: googleIdFromProfile, // CHANGED from provider_id
                }
            });
            return done(null, newUser);

        } catch (error) {
            console.error('❌ Error in Google OAuth Strategy:', error);
            return done(error, false);
        }
    })
);


// ===================================================
// 3. JWT STRATEGY (The Gatekeeper for your API)
// ===================================================
// This runs on every protected API request to verify the token.
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
};

passport.use(
    new JwtStrategy(jwtOptions, async (payload, done) => {
        try {
            // The payload contains the data we put in the JWT (userId, email)
            const user = await prisma.user.findUnique({
                where: { id: payload.userId }
            });

            if (user) {
                // If user is found, attach them to the request object
                return done(null, user);
            } else {
                // If user is not found (e.g., deleted), fail authentication
                return done(null, false);
            }
        } catch (error) {
            return done(error, false);
        }
    })
);


// ======================================================================
// ❌ REMOVE SERIALIZE AND DESERIALIZE - They are for sessions only.
// ======================================================================
/*
passport.serializeUser((user, done) => {
    // This is not needed for JWT
});

passport.deserializeUser(async (id, done) => {
    // This is not needed for JWT
});
*/

export default passport;