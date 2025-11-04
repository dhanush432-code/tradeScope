// config/passport-setup.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test database connection
prisma.$connect()
    .then(() => console.log('✅ Prisma connected to database'))
    .catch(err => console.error('❌ Prisma connection failed:', err.message));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
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
        let user = await prisma.user.findUnique({
            where: { id: profile.id }
        });

        if (user) {
            console.log('👤 Existing user found, updating...');
            // Update existing user
            user = await prisma.user.update({
                where: { id: profile.id },
                data: {
                    email: profile.emails[0].value,
                    displayName: profile.displayName,
                    avatarUrl: profile.photos?.[0]?.value || null,
                    provider: 'google',
                    googleId: profile.id
                }
            });
            console.log('✅ User updated:', user.email);
        } else {
            console.log('👤 New user, creating...');
            // Create new user
            user = await prisma.user.create({
                data: {
                    id: profile.id,
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    displayName: profile.displayName,
                    avatarUrl: profile.photos?.[0]?.value || null,
                    provider: 'google'
                }
            });
            console.log('✅ User created:', user.email);
        }

        console.log('========================================');
        return done(null, user);

    } catch (error) {
        console.error('========================================');
        console.error('❌ PASSPORT STRATEGY ERROR:');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
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
        
        const user = await prisma.user.findUnique({ 
            where: { id: String(id) } 
        });
        
        if (!user) {
            console.error('❌ User not found in database:', id);
            return done(new Error('User not found'), null);
        }
        
        console.log('✅ User deserialized:', user.email);
        done(null, user);
        
    } catch (error) {
        console.error('❌ DESERIALIZE ERROR:', error.message);
        done(error, null);
    }
});

// Handle Prisma disconnect on app shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    console.log('Prisma disconnected');
});

module.exports = passport;