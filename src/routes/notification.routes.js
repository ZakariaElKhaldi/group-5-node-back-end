const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications (placeholder - returns empty for now)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        // Return empty notifications array for now
        // The PHP backend had Notification entity but we didn't implement it
        res.json([]);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, async (req, res) => {
    try {
        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

module.exports = router;
