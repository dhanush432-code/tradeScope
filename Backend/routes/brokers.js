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
        const brokers = await prisma.broker.findMany({
            where: { userId: req.user.id }
        });
        res.json(brokers);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch brokers', error: error.message });
    }
});

router.get('/status', async (req, res) => {
    try {
        const brokers = await prisma.broker.findMany({
            where: { userId: req.user.id },
            select: { id: true, brokerName: true, isActive: true, lastSyncedAt: true }
        });
        res.json(brokers);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get status', error: error.message });
    }
});

module.exports = router;