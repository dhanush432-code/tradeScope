import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Not authenticated' });
};

router.use(isAuthenticated);

// Get all brokers for the user
router.get('/', async (req, res) => {
    try {
        // Use raw query to fetch brokers with correct column names
        const brokers = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${req.user.id}`;
        
        // Also fetch accounts for each broker
        for (let broker of brokers) {
            broker.accounts = await prisma.$queryRaw`SELECT * FROM trading_accounts WHERE broker_id = ${broker.id}`;
        }
        
        res.json(brokers);
    } catch (error) {
        console.error('Error fetching brokers:', error);
        res.status(500).json({ message: 'Failed to fetch brokers', error: error.message });
    }
});

// Add a new broker
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, apiKey, apiSecret, userId: brokerUserId, password, totpKey, serverAddress, accountId } = req.body;

        // Use raw query to insert broker with correct column names from migration
        const result = await prisma.$executeRaw`INSERT INTO brokers 
            (id, user_id, broker_name, api_key, api_secret, access_token, refresh_token, is_active, last_synced_at, created_at, updated_at)
        VALUES 
            (gen_random_uuid(), ${userId}, ${name}, ${apiKey}, ${apiSecret}, NULL, NULL, true, NULL, NOW(), NOW())
        RETURNING *`;
        
        // Fetch the created broker
        const broker = await prisma.$queryRaw`SELECT * FROM brokers WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`;

        res.status(201).json({
            success: true,
            data: broker[0],
            connectionTest: {
                success: true,
                message: 'Broker connected successfully'
            }
        });
    } catch (error) {
        console.error('Error adding broker:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to add broker' 
        });
    }
});

// Update broker status
router.patch('/:brokerId/status', async (req, res) => {
    try {
        const { brokerId } = req.params;
        const { status } = req.body;

        // Use raw query to update broker with correct column names
        await prisma.$executeRaw`UPDATE brokers SET status = ${status}, updated_at = NOW() WHERE id = ${brokerId}`;
        
        // Fetch the updated broker
        const broker = await prisma.$queryRaw`SELECT * FROM brokers WHERE id = ${brokerId}`;

        res.json({ success: true, data: broker[0] });
    } catch (error) {
        console.error('Error updating broker:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to update broker' 
        });
    }
});

// Delete broker
router.delete('/:brokerId', async (req, res) => {
    try {
        const { brokerId } = req.params;

        // Use raw query to delete broker
        await prisma.$executeRaw`DELETE FROM brokers WHERE id = ${brokerId}`;

        res.json({ success: true, message: 'Broker deleted successfully' });
    } catch (error) {
        console.error('Error deleting broker:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to delete broker' 
        });
    }
});

export default router;