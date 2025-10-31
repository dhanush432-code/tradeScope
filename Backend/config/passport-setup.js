const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('../db/index'); // Use the new Prisma client

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
        const { id, displayName, emails, photos } = profile;
        const email = emails[0].value;
        const avatarUrl = photos ? photos[0].value : null;

        try {
            // Find a user OR create one if they don't exist
            const user = await prisma.user.upsert({
                where: { id: id },
                update: { displayName, avatarUrl },
                create: {
                    id: id,
                    email: email,
                    displayName: displayName,
                    avatarUrl: avatarUrl,
                    provider: 'google',
                }
            });
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);