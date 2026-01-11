const express = require('express');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth.middleware');
const { Technicien, User, Machine, WorkOrder } = require('../models');

const router = express.Router();

/**
 * GET /api/techniciens
 * List technicians with pagination
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const statut = req.query.statut;
        const offset = (page - 1) * limit;

        const where = {};
        if (statut) where.statut = statut;

        const include = [{ model: User, as: 'user', attributes: ['id', 'email', 'nom', 'prenom'] }];

        // Search in user fields
        let userWhere = {};
        if (search) {
            userWhere = {
                [Op.or]: [
                    { nom: { [Op.like]: `%${search}%` } },
                    { prenom: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                ],
            };
            include[0].where = userWhere;
        }

        const { count, rows } = await Technicien.findAndCountAll({
            where,
            include,
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
        console.error('List techniciens error:', error);
        res.status(500).json({ error: 'Failed to list techniciens' });
    }
});

/**
 * GET /api/techniciens/:id
 * Get single technician
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const technicien = await Technicien.findByPk(req.params.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'email', 'nom', 'prenom'] }],
        });

        if (!technicien) {
            return res.status(404).json({ error: 'Technicien not found' });
        }

        res.json(technicien);
    } catch (error) {
        console.error('Get technicien error:', error);
        res.status(500).json({ error: 'Failed to get technicien' });
    }
});

/**
 * POST /api/techniciens
 * Create new technician (creates user account too)
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { email, nom, prenom, password, specialite, tauxHoraire, statut } = req.body;

        // Create user
        const user = await User.create({
            email,
            nom,
            prenom,
            password: password || 'password123',
            roles: ['ROLE_TECHNICIEN'],
        });

        // Create technicien
        const technicien = await Technicien.create({
            userId: user.id,
            specialite: specialite || '',
            tauxHoraire: parseFloat(tauxHoraire) || 50.0,
            statut: statut || 'Disponible',
        });

        // Reload with user
        const result = await Technicien.findByPk(technicien.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'email', 'nom', 'prenom'] }],
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create technicien error:', error);
        res.status(500).json({ error: 'Failed to create technicien' });
    }
});

/**
 * PUT /api/techniciens/:id
 * Update technician
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const technicien = await Technicien.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
        });

        if (!technicien) {
            return res.status(404).json({ error: 'Technicien not found' });
        }

        const { nom, prenom, email, specialite, tauxHoraire, statut } = req.body;

        // Update technicien
        if (specialite !== undefined) technicien.specialite = specialite;
        if (tauxHoraire !== undefined) technicien.tauxHoraire = parseFloat(tauxHoraire);
        if (statut !== undefined) technicien.statut = statut;
        await technicien.save();

        // Update user
        const user = technicien.user;
        if (nom !== undefined) user.nom = nom;
        if (prenom !== undefined) user.prenom = prenom;
        if (email !== undefined) user.email = email;
        await user.save();

        // Reload
        const result = await Technicien.findByPk(technicien.id, {
            include: [{ model: User, as: 'user', attributes: ['id', 'email', 'nom', 'prenom'] }],
        });

        res.json(result);
    } catch (error) {
        console.error('Update technicien error:', error);
        res.status(500).json({ error: 'Failed to update technicien' });
    }
});

/**
 * GET /api/techniciens/:id/workorders
 * Get technician's work orders
 */
router.get('/:id/workorders', authenticate, async (req, res) => {
    try {
        const technicien = await Technicien.findByPk(req.params.id);

        if (!technicien) {
            return res.status(404).json({ error: 'Technicien not found' });
        }

        const workorders = await WorkOrder.findAll({
            where: { technicienId: technicien.id },
            include: [{ model: Machine, as: 'machine' }],
            order: [['dateReported', 'DESC']],
        });

        res.json(workorders);
    } catch (error) {
        console.error('Get workorders error:', error);
        res.status(500).json({ error: 'Failed to get workorders' });
    }
});

/**
 * DELETE /api/techniciens/:id
 * Delete technician (and user)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const technicien = await Technicien.findByPk(req.params.id, {
            include: [{ model: User, as: 'user' }],
        });

        if (!technicien) {
            return res.status(404).json({ error: 'Technicien not found' });
        }

        const user = technicien.user;
        await technicien.destroy();
        await user.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete technicien error:', error);
        res.status(500).json({ error: 'Failed to delete technicien' });
    }
});

module.exports = router;
