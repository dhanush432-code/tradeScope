// ============================================
// Backend/routes/upstox.js
// ============================================
import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

// Upstox API configuration
const UPSTOX_API_URL = 'https://api.upstox.com/v2';
const UPSTOX_CLIENT_ID = process.env.UPSTOX_CLIENT_ID;
const UPSTOX_CLIENT_SECRET = process.env.UPSTOX_CLIENT_SECRET;
const UPSTOX_REDIRECT_URI = process.env.UPSTOX_REDIRECT_URI || 'http://localhost:3001/api/upstox/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4028p';

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Not authenticated' });
};

router.use(isAuthenticated);

// ===================================================
// GET UPSTOX STATUS
// ===================================================
router.get('/status', async (req, res) => {
    try {
        // Check if user has Upstox broker connected
        // Use raw query with correct column names
        const result = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${req.user.id} AND broker_name ILIKE '%Upstox%'`;
        const upstoxBroker = result && result.length > 0 ? result[0] : null;

        if (!upstoxBroker) {
            return res.json({
                success: true,
                data: {
                    isConnected: false,
                    status: 'disconnected',
                    message: 'Upstox not connected'
                }
            });
        }

        // Check if tokens exist and are valid
        const hasValidTokens = upstoxBroker.accessToken && upstoxBroker.accessToken.length > 0;

        res.json({
            success: true,
            data: {
                isConnected: hasValidTokens,
                status: hasValidTokens ? 'connected' : 'disconnected',
                lastSync: upstoxBroker.updatedAt,
                broker: {
                    id: upstoxBroker.id,
                    name: upstoxBroker.name,
                    isActive: upstoxBroker.isActive,
                    createdAt: upstoxBroker.createdAt,
                    updatedAt: upstoxBroker.updatedAt,
                    metadata: upstoxBroker.metadata
                }
            }
        });
    } catch (error) {
        console.error('❌ Error fetching Upstox status:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch Upstox status',
            error: error.message
        });
    }
});

// ===================================================
// GET UPSTOX AUTH URL
// ===================================================
router.get('/auth-url', async (req, res) => {
    try {
        console.log('📍 Generating Upstox auth URL...');
        
        // Validate environment variables
        if (!UPSTOX_CLIENT_ID) {
            console.error('❌ UPSTOX_CLIENT_ID is not set in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Upstox client ID is not configured. Please contact administrator.',
                error: 'UPSTOX_CLIENT_ID not set'
            });
        }

        if (!UPSTOX_REDIRECT_URI) {
            console.error('❌ UPSTOX_REDIRECT_URI is not set');
            return res.status(500).json({
                success: false,
                message: 'Upstox redirect URI is not configured. Please contact administrator.',
                error: 'UPSTOX_REDIRECT_URI not set'
            });
        }

        // Generate state parameter for security
        const state = Buffer.from(JSON.stringify({
            userId: req.user.id,
            timestamp: Date.now()
        })).toString('base64');

        // Construct authorization URL according to Upstox API v2 specs
        const authUrl = `https://api.upstox.com/v2/login/authorization/dialog` +
            `?client_id=${encodeURIComponent(UPSTOX_CLIENT_ID)}` +
            `&redirect_uri=${encodeURIComponent(UPSTOX_REDIRECT_URI)}` +
            `&response_type=code` +
            `&state=${encodeURIComponent(state)}`;

        console.log('✅ Upstox auth URL generated successfully');
        console.log('Client ID:', UPSTOX_CLIENT_ID.substring(0, 10) + '...');
        console.log('Redirect URI:', UPSTOX_REDIRECT_URI);

        res.json({
            success: true,
            data: {
                authUrl: authUrl
            }
        });
    } catch (error) {
        console.error('❌ Error generating Upstox auth URL:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to generate authorization URL',
            error: error.message
        });
    }
});

// ===================================================
// UPSTOX OAUTH CALLBACK
// ===================================================
router.get('/callback', async (req, res) => {
    const { code, state, error: oauthError } = req.query;

    console.log('📍 Upstox callback received');
    console.log('Code:', code ? '✅ Present' : '❌ Missing');
    console.log('State:', state ? '✅ Present' : '❌ Missing');

    // Handle OAuth errors
    if (oauthError) {
        console.error('❌ Upstox OAuth error:', oauthError);
        return res.redirect(`${FRONTEND_URL}/broker-integration?upstox_error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
        console.error('❌ No authorization code received from Upstox');
        return res.redirect(`${FRONTEND_URL}/broker-integration?upstox_error=no_code`);
    }

    try {
        // Decode and validate state
        let userId;
        if (state) {
            try {
                const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
                userId = stateData.userId;
            } catch (e) {
                console.warn('⚠️ Could not decode state parameter');
            }
        }

        console.log('🔄 Exchanging authorization code for access token...');

        // Exchange authorization code for access token
        const tokenResponse = await axios.post(
            `${UPSTOX_API_URL}/login/authorization/token`,
            new URLSearchParams({
                code: code,
                client_id: UPSTOX_CLIENT_ID,
                client_secret: UPSTOX_CLIENT_SECRET,
                redirect_uri: UPSTOX_REDIRECT_URI,
                grant_type: 'authorization_code'
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        );

        const { access_token } = tokenResponse.data;

        if (!access_token) {
            throw new Error('No access token received from Upstox');
        }

        console.log('✅ Access token received from Upstox');

        // Fetch user profile from Upstox to get user details
        const profileResponse = await axios.get(`${UPSTOX_API_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Accept': 'application/json'
            }
        });

        const upstoxProfile = profileResponse.data.data;
        console.log('✅ Upstox profile fetched:', upstoxProfile.email);

        // Save or update broker connection in database using raw queries
        // First check if broker exists
        const existingBrokers = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${userId} AND broker_name = 'Upstox'`;
        
        if (existingBrokers && existingBrokers.length > 0) {
            // Update existing broker
            await prisma.$executeRaw`UPDATE brokers SET 
                access_token = ${access_token},
                is_active = true,
                updated_at = NOW()
            WHERE user_id = ${userId} AND broker_name = 'Upstox'`;
            
            // Fetch updated broker
            const result = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${userId} AND broker_name = 'Upstox'`;
            const broker = result[0];
        } else {
            // Create new broker
            await prisma.$executeRaw`INSERT INTO brokers 
                (id, user_id, broker_name, access_token, is_active, created_at, updated_at)
            VALUES 
                (gen_random_uuid(), ${userId}, 'Upstox', ${access_token}, true, NOW(), NOW())`;
            
            // Fetch created broker
            const result = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${userId} AND broker_name = 'Upstox'`;
            const broker = result[0];
        }

        console.log('✅ Broker connection saved to database');

        // Redirect back to frontend with success
        res.redirect(`${FRONTEND_URL}/broker-integration?upstox_success=true`);

    } catch (error) {
        console.error('❌ Error in Upstox callback:', error.response?.data || error.message);
        
        // Log detailed error for debugging
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }

        res.redirect(`${FRONTEND_URL}/broker-integration?upstox_error=connection_failed`);
    }
});

// ===================================================
// GET UPSTOX PROFILE
// ===================================================
router.get('/profile', async (req, res) => {
    try {
        // Get broker connection from database
        // Use raw query with correct column names
        const result = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${req.user.id} AND broker_name ILIKE '%Upstox%' AND is_active = true`;
        const broker = result && result.length > 0 ? result[0] : null;

        if (!broker || !broker.accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Upstox account not connected'
            });
        }

        // Fetch profile from Upstox
        const response = await axios.get(`${UPSTOX_API_URL}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${broker.accessToken}`,
                'Accept': 'application/json'
            }
        });

        res.json({
            success: true,
            data: response.data.data
        });

    } catch (error) {
        console.error('❌ Error fetching Upstox profile:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch Upstox profile',
            error: error.response?.data || error.message
        });
    }
});

// ===================================================
// GET UPSTOX HOLDINGS
// ===================================================
router.get('/holdings', async (req, res) => {
    try {
        // Use raw query with correct column names
        const result = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${req.user.id} AND broker_name ILIKE '%Upstox%' AND is_active = true`;
        const broker = result && result.length > 0 ? result[0] : null;

        if (!broker || !broker.accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Upstox account not connected'
            });
        }

        const response = await axios.get(`${UPSTOX_API_URL}/portfolio/long-term-holdings`, {
            headers: {
                'Authorization': `Bearer ${broker.accessToken}`,
                'Accept': 'application/json'
            }
        });

        res.json({
            success: true,
            data: response.data.data
        });

    } catch (error) {
        console.error('❌ Error fetching Upstox holdings:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch holdings',
            error: error.response?.data || error.message
        });
    }
});

// ===================================================
// IMPORT TRADES FROM UPSTOX
// ===================================================
router.post('/import-trades', async (req, res) => {
    try {
        // Use raw query with correct column names
        const result = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${req.user.id} AND broker_name ILIKE '%Upstox%' AND is_active = true`;
        const broker = result && result.length > 0 ? result[0] : null;

        if (!broker || !broker.accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Upstox account not connected'
            });
        }

        // Fetch trade history from Upstox
        // Note: You'll need to implement the actual trade import logic
        // This is a placeholder
        
        res.json({
            success: true,
            message: 'Trade import started',
            data: {
                imported: 0,
                message: 'Trade import functionality coming soon'
            }
        });
    } catch (error) {
        console.error('❌ Error importing trades:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to import trades',
            error: error.message
        });
    }
});

// ===================================================
// DISCONNECT UPSTOX
// ===================================================
router.post('/disconnect', async (req, res) => {
    try {
        // Update broker to inactive and clear tokens using raw query
        await prisma.$executeRaw`UPDATE brokers SET 
            is_active = false,
            access_token = NULL,
            updated_at = NOW()
        WHERE user_id = ${req.user.id} AND broker_name ILIKE '%Upstox%'`;

        console.log('✅ Upstox disconnected for user:', req.user.id);

        res.json({
            success: true,
            message: 'Upstox account disconnected successfully'
        });

    } catch (error) {
        console.error('❌ Error disconnecting Upstox:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect Upstox account',
            error: error.message
        });
    }
});

export default router;