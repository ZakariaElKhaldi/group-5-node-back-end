const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { Technicien, Role } = require('../models');

const router = express.Router();

/**
 * GET /api/me
 * Get current authenticated user info
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = req.user;

        // Find technicien profile if exists
        const technicien = await Technicien.findOne({ where: { userId: user.id } });

        // Find role if roleId exists
        let role = null;
        if (user.roleId) {
            role = await Role.findByPk(user.roleId);
            if (role) {
                role = {
                    id: role.id,
                    name: role.name,
                    displayName: role.displayName,
                    permissions: role.permissions || [],
                };
            }
        }

        const response = {
            id: user.id,
            email: user.email,
            nom: user.nom,
            prenom: user.prenom,
            roles: user.getRoles(),
            role: role, // NEW: dynamic role object
            technicien: null,
        };

        if (technicien) {
            response.technicien = {
                id: technicien.id,
                specialite: technicien.specialite,
                tauxHoraire: technicien.tauxHoraire,
                statut: technicien.statut,
            };
        }

        res.json(response);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

/**
 * PATCH /api/me/status
 * Update technician status
 */
router.patch('/me/status', authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { statut } = req.body;

        const technicien = await Technicien.findOne({ where: { userId: user.id } });

        if (!technicien) {
            return res.status(403).json({ error: 'Not a technician' });
        }

        const validStatuses = ['Disponible', 'En intervention', 'Absent'];
        if (!statut || !validStatuses.includes(statut)) {
            return res.status(400).json({
                error: 'Invalid status',
                valid: validStatuses
            });
        }

        technicien.statut = statut;
        await technicien.save();

        res.json({
            statut: technicien.statut,
            message: 'Status updated successfully'
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
