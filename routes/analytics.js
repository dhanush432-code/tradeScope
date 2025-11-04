// ==============================================
// FILE: Backend/routes/analytics.js
// ==============================================
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router.use(isAuthenticated);

router.get('/data', async (req, res) => {
    try {
        const userId = req.user.id;
        const { dateFrom, dateTo } = req.query;

        const where = { userId };
        if (dateFrom || dateTo) {
            where.tradeDate = {};
            if (dateFrom) where.tradeDate.gte = new Date(dateFrom);
            if (dateTo) where.tradeDate.lte = new Date(dateTo);
        }

        const trades = await prisma.trade.findMany({
            where,
            orderBy: { tradeDate: 'asc' }
        });

        res.json(trades);
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Failed to fetch analytics data', error: error.message });
    }
});

export default router;

