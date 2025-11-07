// config/passport-setup.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: 'C:\\Users\\Administrator\\Downloads\\Trade Scope\\Backend\\.env' });

const prisma = new PrismaClient();

// Test database connection
prisma.$connect()
    .then(() => console.log('✅ Prisma connected to database'))
    .catch(err => console.error('❌ Prisma connection failed:', err.message));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || '/auth/google/callback',
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    console.log('========================================');
    console.log('🔐 Google OAuth Callback Started');
    console.log('Access Token:', accessToken ? 'Present' : 'Missing');
    console.log('Refresh Token:', refreshToken ? 'Present' : 'Missing');
    console.log('Profile:', profile ? 'Present' : 'Missing');
    if (profile) {
        console.log('Profile ID:', profile.id);
        console.log('Profile Emails:', profile.emails);
        console.log('Profile Name:', profile.displayName);
    }
    console.log('========================================');
    try {
        console.log('========================================');
        console.log('🔐 Google OAuth Callback Started');
        console.log('Profile ID:', profile.id);
        console.log('Email:', profile.emails?.[0]?.value);
        console.log('Name:', profile.displayName);
        console.log('========================================');

        if (!profile.id || !profile.emails?.[0]?.value) {
            throw new Error('Missing profile information from Google');
        }

        // Check if user exists
        // Using raw query to directly access the users table
        let user = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${profile.id}`;
        if (user && user.length > 0) {
            user = user[0];
        } else {
            user = null;
        }

        if (user) {
            console.log('👤 Existing user found, updating...');
            // Update existing user using raw query
            await prisma.$executeRaw`UPDATE users SET 
                email = ${profile.emails[0].value},
                display_name = ${profile.displayName},
                avatar_url = ${profile.photos?.[0]?.value || null},
                provider = 'google',
                google_id = ${profile.id},
                updated_at = NOW()
            WHERE id = ${profile.id}`;
            
            // Fetch updated user
            user = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${profile.id}`;
            if (user && user.length > 0) {
                user = user[0];
            }
            console.log('✅ User updated:', user.email);
        } else {
            console.log('👤 New user, creating...');
            // Create new user using raw query
            await prisma.$executeRaw`INSERT INTO users 
                (id, google_id, email, display_name, avatar_url, provider, created_at, updated_at)
            VALUES 
                (${profile.id}, ${profile.id}, ${profile.emails[0].value}, ${profile.displayName}, ${profile.photos?.[0]?.value || null}, 'google', NOW(), NOW())`;
            
            // Fetch created user
            user = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${profile.id}`;
            if (user && user.length > 0) {
                user = user[0];
            }
            console.log('✅ User created:', user.email);
        }

        console.log('========================================');
        return done(null, user);

    } catch (error) {
        console.error('========================================');
        console.error('❌ PASSPORT STRATEGY ERROR:');
        console.error('Error:', error.message);
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Stack:', error.stack);
        console.error('Profile:', profile);
        // Log more details about the error
        if (error.meta) {
            console.error('Error meta:', error.meta);
        }
        if (error.clientVersion) {
            console.error('Client version:', error.clientVersion);
        }
        
        // Special handling for table not found errors
        if (error.message && error.message.includes('does not exist in the current database')) {
            console.error('🔧 This error is likely due to a table name mapping issue.');
            console.error('🔧 The Prisma model name might not match the actual database table name.');
        }
        
        console.error('========================================');
        return done(error, null);
    }
}));

// Serialize user - store user ID in session
passport.serializeUser((user, done) => {
    console.log('📦 Serializing user:', user.id, user.email);
    done(null, user.id);
});

// Deserialize user - retrieve user from database using session ID
passport.deserializeUser(async (id, done) => {
    try {
        console.log('📦 Deserializing user ID:', id);
        
        // Add additional logging for debugging
        console.log('Prisma client status:', prisma ? 'Available' : 'Missing');
        
        // Using raw query to directly access the users table
        const result = await prisma.$queryRaw`SELECT * FROM users WHERE id = ${String(id)}`;
        const user = result && result.length > 0 ? result[0] : null;
        
        if (!user) {
            console.error('❌ User not found in database:', id);
            return done(new Error('User not found'), null);
        }
        
        console.log('✅ User deserialized:', user.email);
        done(null, user);
        
    } catch (error) {
        console.error('========================================');
        console.error('❌ DESERIALIZE ERROR:');
        console.error('Error:', error.message);
        console.error('Error stack:', error.stack);
        console.error('User ID:', id);
        // Add more detailed error information
        if (error.meta) {
            console.error('Error meta:', error.meta);
        }
        if (error.clientVersion) {
            console.error('Client version:', error.clientVersion);
        }
        console.error('========================================');
        done(error, null);
    }
});

// Handle Prisma disconnect on app shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    console.log('Prisma disconnected');
});

export default passport;
