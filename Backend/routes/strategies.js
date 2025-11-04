const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        const strategies = await prisma.strategy.findMany({
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

module.exports = router;