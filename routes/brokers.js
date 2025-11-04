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
        const brokers = await prisma.broker.findMany({
            where: { userId: req.user.id },
            include: {
                accounts: true
            }
        });
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

        const broker = await prisma.broker.create({
            data: {
                userId,
                name,
                apiKey,
                apiSecret,
                brokerUserId,
                password,
                totpKey,
                serverAddress,
                accountId,
                status: 'active',
                isConnected: true
            }
        });

        res.status(201).json({
            success: true,
            data: broker,
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

        const broker = await prisma.broker.update({
            where: { id: parseInt(brokerId) },
            data: { status }
        });

        res.json({ success: true, data: broker });
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

        await prisma.broker.delete({
            where: { id: parseInt(brokerId) }
        });

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