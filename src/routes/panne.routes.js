const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { requireReceptionist, requireAdmin } = require('../middleware/roles.middleware');
const { Panne, Machine, Intervention, Technicien, User } = require('../models');

const router = express.Router();

/**
 * GET /api/pannes
 * List pannes - returns array (not paginated) to match PHP backend
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const statut = req.query.statut;
        const gravite = req.query.gravite;

        const where = {};
        if (statut) where.statut = statut;
        if (gravite) where.gravite = gravite;

        const pannes = await Panne.findAll({
            where,
            include: [
                { model: Machine, as: 'machine', attributes: ['id', 'reference', 'modele'] },
                {
                    model: Intervention, as: 'intervention',
                    include: [{ model: Technicien, as: 'technicien', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] }]
                },
            ],
            order: [['dateDeclaration', 'DESC']],
        });

        // Return array directly (not paginated object)
        res.json(pannes);
    } catch (error) {
        console.error('List pannes error:', error);
        res.status(500).json({ error: 'Failed to list pannes' });
    }
});

/**
 * GET /api/pannes/:id
 * Get single panne
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const panne = await Panne.findByPk(req.params.id, {
            include: [
                { model: Machine, as: 'machine' },
                { model: Intervention, as: 'intervention' },
            ],
        });

        if (!panne) {
            return res.status(404).json({ error: 'Panne not found' });
        }

        res.json(panne);
    } catch (error) {
        console.error('Get panne error:', error);
        res.status(500).json({ error: 'Failed to get panne' });
    }
});

/**
 * GET /api/pannes/machine/:machineId
 * Get pannes for a machine
 */
router.get('/machine/:machineId', authenticate, async (req, res) => {
    try {
        const machine = await Machine.findByPk(req.params.machineId);

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const pannes = await Panne.findAll({
            where: { machineId: machine.id },
            include: [{ model: Intervention, as: 'intervention' }],
            order: [['dateDeclaration', 'DESC']],
        });

        res.json(pannes);
    } catch (error) {
        console.error('Get machine pannes error:', error);
        res.status(500).json({ error: 'Failed to get pannes' });
    }
});

/**
 * POST /api/pannes
 * Create panne (with associated intervention)
 */
router.post('/', authenticate, requireReceptionist, async (req, res) => {
    try {
        const { machineId, description, gravite, technicienId, priorite } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId is required' });
        }

        const machine = await Machine.findByPk(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        // Create intervention first
        const intervention = await Intervention.create({
            machineId,
            technicienId: technicienId || null,
            type: 'corrective',
            priorite: priorite || 'Normale',
            statut: 'En attente',
            dateDebut: new Date(),
            description,
        });

        // Freeze technician rate if assigned
        if (technicienId) {
            const technicien = await Technicien.findByPk(technicienId);
            if (technicien) {
                intervention.tauxHoraireApplique = technicien.tauxHoraire;
                await intervention.save();
            }
        }

        // Create panne linked to intervention
        const panne = await Panne.create({
            machineId,
            interventionId: intervention.id,
            dateDeclaration: new Date(),
            description,
            gravite: gravite || 'Moyenne',
            statut: technicienId ? 'En traitement' : 'Declaree',
        });

        const result = await Panne.findByPk(panne.id, {
            include: [
                { model: Machine, as: 'machine' },
                { model: Intervention, as: 'intervention' },
            ],
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create panne error:', error);
        res.status(500).json({ error: 'Failed to create panne' });
    }
});

/**
 * PUT /api/pannes/:id
 * Update panne
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const panne = await Panne.findByPk(req.params.id, {
            include: [{ model: Intervention, as: 'intervention' }],
        });

        if (!panne) {
            return res.status(404).json({ error: 'Panne not found' });
        }

        const { description, gravite, statut } = req.body;

        if (description !== undefined) panne.description = description;
        if (gravite !== undefined) panne.gravite = gravite;

        // Handle status sync with intervention
        if (statut !== undefined) {
            panne.statut = statut;

            if (statut === 'Resolue' && panne.intervention) {
                panne.intervention.statut = 'Terminee';
                panne.intervention.dateFinReelle = new Date();
                panne.intervention.calculateCosts();
                await panne.intervention.save();

                // Update machine status
                const machine = await Machine.findByPk(panne.machineId);
                if (machine) {
                    machine.statut = 'En service';
                    await machine.save();
                }
            }
        }

        await panne.save();

        const result = await Panne.findByPk(panne.id, {
            include: [
                { model: Machine, as: 'machine' },
                { model: Intervention, as: 'intervention' },
            ],
        });

        res.json(result);
    } catch (error) {
        console.error('Update panne error:', error);
        res.status(500).json({ error: 'Failed to update panne' });
    }
});

/**
 * DELETE /api/pannes/:id
 * Delete panne
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const panne = await Panne.findByPk(req.params.id, {
            include: [{ model: Intervention, as: 'intervention' }],
        });

        if (!panne) {
            return res.status(404).json({ error: 'Panne not found' });
        }

        // Delete linked intervention if not in progress
        if (panne.intervention && !['En cours'].includes(panne.intervention.statut)) {
            await panne.intervention.destroy();
        }

        await panne.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete panne error:', error);
        res.status(500).json({ error: 'Failed to delete panne' });
    }
});

module.exports = router;
