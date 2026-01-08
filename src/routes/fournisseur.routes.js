const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { Fournisseur, Piece } = require('../models');

const router = express.Router();

/**
 * GET /api/fournisseurs
 * List fournisseurs with pagination
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
            ];
        }

        const { count, rows } = await Fournisseur.findAndCountAll({
            where,
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
        console.error('List fournisseurs error:', error);
        res.status(500).json({ error: 'Failed to list fournisseurs' });
    }
});

/**
 * GET /api/fournisseurs/:id
 * Get single fournisseur
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const fournisseur = await Fournisseur.findByPk(req.params.id, {
            include: [{ model: Piece, as: 'pieces', attributes: ['id', 'reference', 'nom'] }],
        });

        if (!fournisseur) {
            return res.status(404).json({ error: 'Fournisseur not found' });
        }

        res.json(fournisseur);
    } catch (error) {
        console.error('Get fournisseur error:', error);
        res.status(500).json({ error: 'Failed to get fournisseur' });
    }
});

/**
 * POST /api/fournisseurs
 * Create fournisseur
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { nom, email, telephone, adresse, delaiLivraison } = req.body;

        const fournisseur = await Fournisseur.create({
            nom,
            email,
            telephone,
            adresse,
            delaiLivraison: delaiLivraison ? parseInt(delaiLivraison) : null,
        });

        res.status(201).json(fournisseur);
    } catch (error) {
        console.error('Create fournisseur error:', error);
        res.status(500).json({ error: 'Failed to create fournisseur' });
    }
});

/**
 * PUT /api/fournisseurs/:id
 * Update fournisseur
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const fournisseur = await Fournisseur.findByPk(req.params.id);

        if (!fournisseur) {
            return res.status(404).json({ error: 'Fournisseur not found' });
        }

        const { nom, email, telephone, adresse, delaiLivraison } = req.body;

        if (nom !== undefined) fournisseur.nom = nom;
        if (email !== undefined) fournisseur.email = email;
        if (telephone !== undefined) fournisseur.telephone = telephone;
        if (adresse !== undefined) fournisseur.adresse = adresse;
        if (delaiLivraison !== undefined) fournisseur.delaiLivraison = delaiLivraison ? parseInt(delaiLivraison) : null;

        await fournisseur.save();

        res.json(fournisseur);
    } catch (error) {
        console.error('Update fournisseur error:', error);
        res.status(500).json({ error: 'Failed to update fournisseur' });
    }
});

/**
 * DELETE /api/fournisseurs/:id
 * Delete fournisseur
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const fournisseur = await Fournisseur.findByPk(req.params.id, {
            include: [{ model: Piece, as: 'pieces' }],
        });

        if (!fournisseur) {
            return res.status(404).json({ error: 'Fournisseur not found' });
        }

        if (fournisseur.pieces && fournisseur.pieces.length > 0) {
            return res.status(409).json({ error: 'Cannot delete supplier with linked parts' });
        }

        await fournisseur.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete fournisseur error:', error);
        res.status(500).json({ error: 'Failed to delete fournisseur' });
    }
});

module.exports = router;
