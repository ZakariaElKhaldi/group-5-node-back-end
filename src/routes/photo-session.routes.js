const express = require('express');
const router = express.Router();
const PhotoSession = require('../models/PhotoSession');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadMultiple, handleUploadError } = require('../middleware/upload.middleware');
const { uploadImage } = require('../config/cloudinary');

/**
 * POST /api/photo-sessions
 * Create a new photo session for mobile photo capture
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { entityType, entityId, context } = req.body;

        // Validate entity type
        if (!entityType || !['machine', 'workorder'].includes(entityType)) {
            return res.status(400).json({ error: 'Invalid entity type. Must be "machine" or "workorder"' });
        }

        // Generate unique session code
        let sessionCode;
        let attempts = 0;
        do {
            sessionCode = PhotoSession.generateSessionCode();
            const existing = await PhotoSession.findOne({ where: { sessionCode } });
            if (!existing) break;
            attempts++;
        } while (attempts < 5);

        if (attempts >= 5) {
            return res.status(500).json({ error: 'Failed to generate unique session code' });
        }

        // Create session with 15-minute expiration
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const session = await PhotoSession.create({
            sessionCode,
            entityType,
            entityId: entityId || null,
            context: context || {},
            status: 'pending',
            createdBy: req.user?.id,
            expiresAt,
        });

        res.status(201).json({
            id: session.id,
            sessionCode: session.sessionCode,
            entityType: session.entityType,
            context: session.context,
            expiresAt: session.expiresAt,
            // QR data to encode
            qrData: `${process.env.API_BASE_URL || 'http://localhost:8001'}/api/photo-sessions/${session.sessionCode}/mobile`,
        });
    } catch (error) {
        console.error('Create photo session error:', error);
        res.status(500).json({ error: 'Failed to create photo session' });
    }
});

/**
 * GET /api/photo-sessions/:code
 * Get session status and images (used by web for polling)
 */
router.get('/:code', authenticate, async (req, res) => {
    try {
        const session = await PhotoSession.findOne({
            where: { sessionCode: req.params.code },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check if expired
        if (new Date() > new Date(session.expiresAt)) {
            session.status = 'expired';
            await session.save();
        }

        res.json({
            id: session.id,
            sessionCode: session.sessionCode,
            entityType: session.entityType,
            entityId: session.entityId,
            context: session.context,
            status: session.status,
            images: session.images || [],
            expiresAt: session.expiresAt,
        });
    } catch (error) {
        console.error('Get photo session error:', error);
        res.status(500).json({ error: 'Failed to get photo session' });
    }
});

/**
 * GET /api/photo-sessions/:code/mobile
 * Mobile app endpoint - no auth required (session code is the auth)
 */
router.get('/:code/mobile', async (req, res) => {
    try {
        const session = await PhotoSession.findOne({
            where: { sessionCode: req.params.code },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        // Check if expired
        if (new Date() > new Date(session.expiresAt)) {
            return res.status(410).json({ error: 'Session expired' });
        }

        // Mark as capturing
        if (session.status === 'pending') {
            session.status = 'capturing';
            await session.save();
        }

        res.json({
            sessionCode: session.sessionCode,
            entityType: session.entityType,
            context: session.context,
            status: session.status,
            remainingTime: Math.max(0, new Date(session.expiresAt) - Date.now()),
        });
    } catch (error) {
        console.error('Mobile get session error:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

/**
 * POST /api/photo-sessions/:code/images
 * Upload images from mobile app
 */
router.post('/:code/images', uploadMultiple, handleUploadError, async (req, res) => {
    try {
        const session = await PhotoSession.findOne({
            where: { sessionCode: req.params.code },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (new Date() > new Date(session.expiresAt)) {
            return res.status(410).json({ error: 'Session expired' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images provided' });
        }

        // Upload to Cloudinary
        const uploadPromises = req.files.map(file =>
            uploadImage(file.buffer, {
                folder: `gmao/photo-sessions/${session.sessionCode}`,
            })
        );

        const uploadResults = await Promise.all(uploadPromises);
        const imageUrls = uploadResults.map(result => result.secure_url);

        // Add to session images
        const currentImages = session.images || [];
        session.images = [...currentImages, ...imageUrls];
        session.status = 'completed';
        await session.save();

        res.json({
            success: true,
            images: session.images,
            count: imageUrls.length,
        });
    } catch (error) {
        console.error('Upload to session error:', error);
        res.status(500).json({ error: 'Failed to upload images' });
    }
});

/**
 * DELETE /api/photo-sessions/:code
 * Cancel/delete a session
 */
router.delete('/:code', authenticate, async (req, res) => {
    try {
        const session = await PhotoSession.findOne({
            where: { sessionCode: req.params.code },
        });

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await session.destroy();
        res.json({ success: true, message: 'Session deleted' });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

module.exports = router;
