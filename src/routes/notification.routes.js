const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { Notification, NotificationRead, User } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

/**
 * GET /api/notifications
 * Get unread notifications for current user (filtered by role)
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const user = req.user;
        const userRoles = user.getRoles();
        const limit = parseInt(req.query.limit) || 20;

        // Get notification IDs that user has already read
        const readNotificationIds = await NotificationRead.findAll({
            where: { userId: user.id },
            attributes: ['notificationId'],
        }).then(reads => reads.map(r => r.notificationId));

        // Build query conditions:
        // 1. Not already read
        // 2. Either no target role OR target role matches user's roles
        const whereConditions = {
            id: {
                [Op.notIn]: readNotificationIds.length > 0 ? readNotificationIds : [0],
            },
            [Op.or]: [
                { targetRole: null },
                { targetRole: { [Op.in]: userRoles } },
            ],
        };

        const notifications = await Notification.findAll({
            where: whereConditions,
            order: [['createdAt', 'DESC']],
            limit,
        });

        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

/**
 * GET /api/notifications/history
 * Get all notifications for current user (including read ones)
 */
router.get('/history', authenticate, async (req, res) => {
    try {
        const user = req.user;
        const userRoles = user.getRoles();
        const limit = parseInt(req.query.limit) || 50;

        // Get all notifications that match user's roles (no read filter)
        const whereConditions = {
            [Op.or]: [
                { targetRole: null },
                { targetRole: { [Op.in]: userRoles } },
            ],
        };

        const notifications = await Notification.findAll({
            where: whereConditions,
            order: [['createdAt', 'DESC']],
            limit,
        });

        // Get read status for each notification
        const readNotificationIds = await NotificationRead.findAll({
            where: { userId: user.id },
            attributes: ['notificationId'],
        }).then(reads => reads.map(r => r.notificationId));

        // Add isRead flag to each notification
        const notificationsWithReadStatus = notifications.map(n => ({
            ...n.toJSON(),
            isRead: readNotificationIds.includes(n.id),
        }));

        res.json(notificationsWithReadStatus);
    } catch (error) {
        console.error('Get notification history error:', error);
        res.status(500).json({ error: 'Failed to get notification history' });
    }
});

/**
 * GET /api/notifications/all
 * List all notifications (Admin only) with pagination
 */
router.get('/all', authenticate, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const offset = (page - 1) * limit;

        const where = {};
        if (type) where.type = type;

        const { count, rows } = await Notification.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        res.json({
            items: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('List all notifications error:', error);
        res.status(500).json({ error: 'Failed to list notifications' });
    }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read for current user
 */
router.post('/:id/read', authenticate, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user.id;

        // Check if notification exists
        const notification = await Notification.findByPk(notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        // Create read record if not exists (upsert-like behavior)
        const [readRecord, created] = await NotificationRead.findOrCreate({
            where: { userId, notificationId },
            defaults: { userId, notificationId, readAt: new Date() },
        });

        res.json({ success: true, alreadyRead: !created });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.post('/read-all', authenticate, async (req, res) => {
    try {
        const user = req.user;
        const userRoles = user.getRoles();

        // Get unread notifications for this user
        const readNotificationIds = await NotificationRead.findAll({
            where: { userId: user.id },
            attributes: ['notificationId'],
        }).then(reads => reads.map(r => r.notificationId));

        const unreadNotifications = await Notification.findAll({
            where: {
                id: {
                    [Op.notIn]: readNotificationIds.length > 0 ? readNotificationIds : [0],
                },
                [Op.or]: [
                    { targetRole: null },
                    { targetRole: { [Op.in]: userRoles } },
                ],
            },
            attributes: ['id'],
        });

        // Create read records for all unread
        const readRecords = unreadNotifications.map(n => ({
            userId: user.id,
            notificationId: n.id,
            readAt: new Date(),
        }));

        if (readRecords.length > 0) {
            await NotificationRead.bulkCreate(readRecords, {
                ignoreDuplicates: true,
            });
        }

        res.json({ success: true, markedCount: readRecords.length });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

/**
 * POST /api/notifications
 * Create a new notification (Admin only)
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { titre, message, type, targetRole } = req.body;

        // Validate required fields
        if (!titre || !message) {
            return res.status(400).json({
                error: 'Titre and message are required',
                fields: {
                    titre: !titre ? 'Required' : null,
                    message: !message ? 'Required' : null,
                },
            });
        }

        // Validate type if provided
        const validTypes = ['info', 'warning', 'alert', 'success'];
        if (type && !validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
            });
        }

        const notification = await Notification.create({
            titre,
            message,
            type: type || 'info',
            targetRole: targetRole || null,
        });

        res.status(201).json(notification);
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        const notification = await Notification.findByPk(notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        // Delete associated read records first
        await NotificationRead.destroy({ where: { notificationId } });

        // Delete notification
        await notification.destroy();

        res.json({ success: true });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

module.exports = router;
