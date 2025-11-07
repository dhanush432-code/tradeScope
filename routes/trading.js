import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router.use(isAuthenticated);

router.get('/accounts', async (req, res) => {
    try {
        // Use raw query with correct column names
        const accounts = await prisma.$queryRaw`SELECT * FROM trading_accounts WHERE user_id = ${req.user.id}`;
        
        // Also fetch broker info for each account
        for (let account of accounts) {
            if (account.broker_id) {
                const brokerResult = await prisma.$queryRaw`SELECT * FROM brokers WHERE id = ${account.broker_id}`;
                account.broker = brokerResult && brokerResult.length > 0 ? brokerResult[0] : null;
            }
        }
        
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
    }
});

export default router;