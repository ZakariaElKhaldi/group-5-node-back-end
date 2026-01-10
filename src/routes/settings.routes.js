const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { Settings } = require('../models');

const router = express.Router();

/**
 * GET /api/settings
 * Get all settings (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const settings = await Settings.findAll({
            order: [['key', 'ASC']],
        });

        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

/**
 * GET /api/settings/company
 * Get company settings (Admin only)
 * NOTE: Must be defined BEFORE /:key route
 */
router.get('/company', authenticate, requireAdmin, async (req, res) => {
    try {
        const setting = await Settings.findOne({ where: { key: 'company' } });
        if (!setting) {
            // Return default empty company data
            return res.json({
                name: '', address: '', phone: '', email: '',
                website: '', ice: '', rc: '', patente: '', if: ''
            });
        }
        // Parse JSON value
        const companyData = JSON.parse(setting.value || '{}');
        res.json(companyData);
    } catch (error) {
        console.error('Get company settings error:', error);
        res.status(500).json({ error: 'Failed to get company settings' });
    }
});

/**
 * PUT /api/settings/company
 * Update company settings (Admin only)
 * NOTE: Must be defined BEFORE /:key route
 */
router.put('/company', authenticate, requireAdmin, async (req, res) => {
    try {
        const companyData = req.body;
        await Settings.setValue('company', JSON.stringify(companyData), 'Company information');
        res.json(companyData);
    } catch (error) {
        console.error('Update company settings error:', error);
        res.status(500).json({ error: 'Failed to update company settings' });
    }
});

/**
 * GET /api/settings/:key
 * Get a specific setting by key (Admin only)
 */
router.get('/:key', authenticate, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;

        const setting = await Settings.findOne({ where: { key } });

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json(setting);
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: 'Failed to get setting' });
    }
});

/**
 * PUT /api/settings/:key
 * Update or create a setting (Admin only)
 */
router.put('/:key', authenticate, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value, description } = req.body;

        // Use the helper method for upsert
        const setting = await Settings.setValue(key, value, description);

        res.json(setting);
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

/**
 * DELETE /api/settings/:key
 * Delete a setting (Admin only)
 */
router.delete('/:key', authenticate, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;

        const setting = await Settings.findOne({ where: { key } });

        if (!setting) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        await setting.destroy();

        res.json({ success: true });
    } catch (error) {
        console.error('Delete setting error:', error);
        res.status(500).json({ error: 'Failed to delete setting' });
    }
});

module.exports = router;
