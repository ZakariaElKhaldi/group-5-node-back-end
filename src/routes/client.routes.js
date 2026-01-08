const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { requireReceptionist, requireAdmin } = require('../middleware/roles.middleware');
const { Client, Machine } = require('../models');

const router = express.Router();

/**
 * GET /api/clients
 * List clients with pagination and search
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where[Op.or] = [
                { nom: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { telephone: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Client.findAndCountAll({
            where,
            include: [{ model: Machine, as: 'machines', attributes: ['id'] }],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        res.json({
            items: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('List clients error:', error);
        res.status(500).json({ error: 'Failed to list clients' });
    }
});

/**
 * GET /api/clients/:id
 * Get single client by ID
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id, {
            include: [{ model: Machine, as: 'machines' }],
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(client);
    } catch (error) {
        console.error('Get client error:', error);
        res.status(500).json({ error: 'Failed to get client' });
    }
});

/**
 * POST /api/clients
 * Create new client
 */
router.post('/', authenticate, requireReceptionist, async (req, res) => {
    try {
        const { nom, telephone, email, adresse, ice, rc, patente } = req.body;

        const client = await Client.create({
            nom,
            telephone,
            email,
            adresse,
            ice,
            rc,
            patente,
        });

        res.status(201).json(client);
    } catch (error) {
        console.error('Create client error:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
});

/**
 * PUT /api/clients/:id
 * Update client
 */
router.put('/:id', authenticate, requireReceptionist, async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const { nom, telephone, email, adresse, ice, rc, patente } = req.body;

        if (nom !== undefined) client.nom = nom;
        if (telephone !== undefined) client.telephone = telephone;
        if (email !== undefined) client.email = email;
        if (adresse !== undefined) client.adresse = adresse;
        if (ice !== undefined) client.ice = ice;
        if (rc !== undefined) client.rc = rc;
        if (patente !== undefined) client.patente = patente;

        await client.save();

        res.json(client);
    } catch (error) {
        console.error('Update client error:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
});

/**
 * DELETE /api/clients/:id
 * Delete client
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.id);

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        await client.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete client error:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
});

module.exports = router;
