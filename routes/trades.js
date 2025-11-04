import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
};

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const { status, symbol, dateFrom, dateTo, limit = 50, offset = 0 } = req.query;
        const userId = req.user.id;

        const where = { userId };
        if (status) where.status = status;
        if (symbol) where.instrument = { contains: symbol, mode: 'insensitive' };
        if (dateFrom || dateTo) {
            where.tradeDate = {};
            if (dateFrom) where.tradeDate.gte = new Date(dateFrom);
            if (dateTo) where.tradeDate.lte = new Date(dateTo);
        }

        const trades = await prisma.trade.findMany({
            where,
            include: {
                account: true,
                strategy: true,
            },
            orderBy: { tradeDate: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset),
        });

        res.json(trades);
    } catch (error) {
        console.error('Error fetching trades:', error);
        res.status(500).json({ message: 'Failed to fetch trades', error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            instrument,
            assetClass,
            tradeType,
            quantity,
            entryPrice,
            exitPrice,
            tradeDate,
            strategy,
            notes,
            process,
            pnl,
            pnlCurrency
        } = req.body;

        if (!instrument || !tradeType || !quantity || !entryPrice || !tradeDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let strategyId = null;
        if (strategy) {
            const strategyRecord = await prisma.strategy.upsert({
                where: {
                    userId_name: {
                        userId,
                        name: strategy
                    }
                },
                update: {},
                create: {
                    userId,
                    name: strategy,
                    isActive: true
                }
            });
            strategyId = strategyRecord.id;
        }

        let calculatedPnl = pnl;
        let pnlPercentage = null;
        let status = 'open';

        if (exitPrice) {
            const multiplier = tradeType === 'BUY' ? 1 : -1;
            calculatedPnl = multiplier * parseFloat(quantity) * (parseFloat(exitPrice) - parseFloat(entryPrice));
            pnlPercentage = ((parseFloat(exitPrice) - parseFloat(entryPrice)) / parseFloat(entryPrice)) * 100 * multiplier;
            status = 'closed';
        }

        const trade = await prisma.trade.create({
            data: {
                userId,
                strategyId,
                instrument,
                assetClass,
                tradeType,
                quantity: parseFloat(quantity),
                entryPrice: parseFloat(entryPrice),
                exitPrice: exitPrice ? parseFloat(exitPrice) : null,
                tradeDate: new Date(tradeDate),
                entryDate: new Date(tradeDate),
                pnl: calculatedPnl ? parseFloat(calculatedPnl) : null,
                pnlPercentage,
                pnlCurrency: pnlCurrency || 'USD',
                fees: 0,
                status,
                process: process || 'manual',
                notes
            },
            include: {
                strategy: true,
                account: true
            }
        });

        res.status(201).json(trade);
    } catch (error) {
        console.error('Error creating trade:', error);
        res.status(500).json({ message: 'Failed to create trade', error: error.message });
    }
});

export default router;