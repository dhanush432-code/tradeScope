const express = require('express');
const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ message: 'Unauthorized' });
};

router.use(isAuthenticated);

router.post('/brokers', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // TODO: Implement broker sync logic
        
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

module.exports = router;