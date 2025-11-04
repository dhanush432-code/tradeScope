const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router.use(isAuthenticated);

router.get('/accounts', async (req, res) => {
    try {
        const accounts = await prisma.tradingAccount.findMany({
            where: { userId: req.user.id },
            include: { broker: true }
        });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch accounts', error: error.message });
    }
});

module.exports = router;