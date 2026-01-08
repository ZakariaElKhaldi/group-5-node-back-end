const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { requireReceptionist, requireAdmin } = require('../middleware/roles.middleware');
const { Machine, Client, Intervention, Technicien, User } = require('../models');

const router = express.Router();

/**
 * GET /api/machines
 * List machines with pagination and search
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const statut = req.query.statut;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where[Op.or] = [
                { reference: { [Op.like]: `%${search}%` } },
                { modele: { [Op.like]: `%${search}%` } },
                { marque: { [Op.like]: `%${search}%` } },
            ];
        }
        if (statut) {
            where.statut = statut;
        }

        const { count, rows } = await Machine.findAndCountAll({
            where,
            include: [{ model: Client, as: 'client', attributes: ['id', 'nom'] }],
            limit,
            offset,
            order: [['id', 'DESC']],
        });

        res.json({
            items: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('List machines error:', error);
        res.status(500).json({ error: 'Failed to list machines' });
    }
});

/**
 * GET /api/machines/:id
 * Get single machine by ID
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const machine = await Machine.findByPk(req.params.id, {
            include: [{ model: Client, as: 'client' }],
        });

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        res.json(machine);
    } catch (error) {
        console.error('Get machine error:', error);
        res.status(500).json({ error: 'Failed to get machine' });
    }
});

/**
 * POST /api/machines
 * Create new machine
 */
router.post('/', authenticate, requireReceptionist, async (req, res) => {
    try {
        const { reference, modele, marque, type, dateAcquisition, statut, clientId } = req.body;

        const machine = await Machine.create({
            reference,
            modele,
            marque,
            type,
            dateAcquisition: dateAcquisition || new Date(),
            statut: statut || 'En service',
            clientId,
        });

        // Reload with associations
        const result = await Machine.findByPk(machine.id, {
            include: [{ model: Client, as: 'client' }],
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create machine error:', error);
        res.status(500).json({ error: 'Failed to create machine' });
    }
});

/**
 * PUT /api/machines/:id
 * Update machine
 */
router.put('/:id', authenticate, requireReceptionist, async (req, res) => {
    try {
        const machine = await Machine.findByPk(req.params.id);

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const { reference, modele, marque, type, dateAcquisition, statut, clientId } = req.body;

        if (reference !== undefined) machine.reference = reference;
        if (modele !== undefined) machine.modele = modele;
        if (marque !== undefined) machine.marque = marque;
        if (type !== undefined) machine.type = type;
        if (dateAcquisition !== undefined) machine.dateAcquisition = dateAcquisition;
        if (statut !== undefined) machine.statut = statut;
        if (clientId !== undefined) machine.clientId = clientId;

        await machine.save();

        // Reload with associations
        const result = await Machine.findByPk(machine.id, {
            include: [{ model: Client, as: 'client' }],
        });

        res.json(result);
    } catch (error) {
        console.error('Update machine error:', error);
        res.status(500).json({ error: 'Failed to update machine' });
    }
});

/**
 * DELETE /api/machines/:id
 * Delete machine
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const machine = await Machine.findByPk(req.params.id);

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        await machine.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete machine error:', error);
        res.status(500).json({ error: 'Failed to delete machine' });
    }
});

/**
 * GET /api/machines/:id/interventions
 * Get interventions for a machine
 */
router.get('/:id/interventions', authenticate, async (req, res) => {
    try {
        const machine = await Machine.findByPk(req.params.id);

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const interventions = await Intervention.findAll({
            where: { machineId: machine.id },
            include: [
                { model: Technicien, as: 'technicien', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom', 'email'] }] },
            ],
            order: [['dateDebut', 'DESC']],
        });

        res.json(interventions);
    } catch (error) {
        console.error('Get machine interventions error:', error);
        res.status(500).json({ error: 'Failed to get interventions' });
    }
});

module.exports = router;
