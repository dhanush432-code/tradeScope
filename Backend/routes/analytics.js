// ==============================================
// FILE: Backend/routes/analytics.js
// ==============================================
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
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

module.exports = router;

// ==============================================
// FILE: Backend/routes/portfolio.js
// ==============================================
const express2 = require('express');
const router2 = express2.Router();
const { PrismaClient: PrismaClient2 } = require('@prisma/client');
const prisma2 = new PrismaClient2();

const isAuthenticated2 = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router2.use(isAuthenticated2);

router2.get('/summary', async (req, res) => {
    try {
        const userId = req.user.id;

        const trades = await prisma2.trade.findMany({
            where: { userId }
        });

        const summary = {
            totalTrades: trades.length,
            openTrades: trades.filter(t => t.status === 'open').length,
            closedTrades: trades.filter(t => t.status === 'closed').length,
            totalPnL: trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0),
            winningTrades: trades.filter(t => parseFloat(t.pnl) > 0).length,
            losingTrades: trades.filter(t => parseFloat(t.pnl) < 0).length,
            winRate: 0
        };

        if (summary.closedTrades > 0) {
            summary.winRate = (summary.winningTrades / summary.closedTrades) * 100;
        }

        res.json(summary);
    } catch (error) {
        console.error('Error fetching portfolio summary:', error);
        res.status(500).json({ message: 'Failed to fetch portfolio summary', error: error.message });
    }
});

module.exports = router2;

// ==============================================
// FILE: Backend/routes/strategies.js
// ==============================================
const express3 = require('express');
const router3 = express3.Router();
const { PrismaClient: PrismaClient3 } = require('@prisma/client');
const prisma3 = new PrismaClient3();

const isAuthenticated3 = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router3.use(isAuthenticated3);

router3.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        const strategies = await prisma3.strategy.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { trades: true }
                }
            }
        });

        res.json(strategies);
    } catch (error) {
        console.error('Error fetching strategies:', error);
        res.status(500).json({ message: 'Failed to fetch strategies', error: error.message });
    }
});

router3.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, description, rules } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Strategy name is required' });
        }

        const strategy = await prisma3.strategy.create({
            data: {
                userId,
                name,
                description,
                rules,
                isActive: true
            }
        });

        res.status(201).json(strategy);
    } catch (error) {
        console.error('Error creating strategy:', error);
        res.status(500).json({ message: 'Failed to create strategy', error: error.message });
    }
});

module.exports = router3;

// ==============================================
// FILE: Backend/routes/sync.js
// ==============================================
const express4 = require('express');
const router4 = express4.Router();

const isAuthenticated4 = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router4.use(isAuthenticated4);

router4.post('/brokers', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // TODO: Implement broker sync logic
        // This should fetch trades from connected brokers
        
        res.json({ 
            message: 'Broker sync initiated',
            status: 'success',
            userId 
        });
    } catch (error) {
        console.error('Error syncing brokers:', error);
        res.status(500).json({ message: 'Failed to sync broker data', error: error.message });
    }
});

module.exports = router4;