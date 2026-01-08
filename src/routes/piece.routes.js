const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { Piece, Fournisseur, MouvementStock } = require('../models');

const router = express.Router();

/**
 * GET /api/pieces
 * List pieces with pagination
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
                { reference: { [Op.like]: `%${search}%` } },
                { nom: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Piece.findAndCountAll({
            where,
            include: [{ model: Fournisseur, as: 'fournisseur', attributes: ['id', 'nom'] }],
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
        console.error('List pieces error:', error);
        res.status(500).json({ error: 'Failed to list pieces' });
    }
});

/**
 * GET /api/pieces/low-stock
 * Get pieces with low stock
 */
router.get('/low-stock', authenticate, async (req, res) => {
    try {
        const pieces = await Piece.findAll({
            where: {
                quantiteStock: { [Op.lte]: require('sequelize').col('seuil_alerte') },
            },
            include: [{ model: Fournisseur, as: 'fournisseur' }],
        });

        res.json(pieces);
    } catch (error) {
        console.error('Get low stock error:', error);
        res.status(500).json({ error: 'Failed to get low stock pieces' });
    }
});

/**
 * GET /api/pieces/:id
 * Get single piece
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const piece = await Piece.findByPk(req.params.id, {
            include: [
                { model: Fournisseur, as: 'fournisseur' },
                { model: MouvementStock, as: 'mouvementsStock', limit: 10, order: [['createdAt', 'DESC']] },
            ],
        });

        if (!piece) {
            return res.status(404).json({ error: 'Piece not found' });
        }

        res.json(piece);
    } catch (error) {
        console.error('Get piece error:', error);
        res.status(500).json({ error: 'Failed to get piece' });
    }
});

/**
 * POST /api/pieces
 * Create new piece
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { reference, nom, description, prixUnitaire, quantiteStock, seuilAlerte, emplacement, fournisseurId } = req.body;

        const piece = await Piece.create({
            reference,
            nom,
            description,
            prixUnitaire: parseFloat(prixUnitaire) || 0,
            quantiteStock: parseInt(quantiteStock) || 0,
            seuilAlerte: parseInt(seuilAlerte) || 5,
            emplacement,
            fournisseurId,
        });

        // Create initial stock movement if stock > 0
        if (piece.quantiteStock > 0) {
            await MouvementStock.create({
                pieceId: piece.id,
                type: 'entree',
                quantite: piece.quantiteStock,
                quantiteAvant: 0,
                quantiteApres: piece.quantiteStock,
                motif: 'Stock initial',
            });
        }

        const result = await Piece.findByPk(piece.id, {
            include: [{ model: Fournisseur, as: 'fournisseur' }],
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create piece error:', error);
        res.status(500).json({ error: 'Failed to create piece' });
    }
});

/**
 * PUT /api/pieces/:id
 * Update piece
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const piece = await Piece.findByPk(req.params.id);

        if (!piece) {
            return res.status(404).json({ error: 'Piece not found' });
        }

        const { reference, nom, description, prixUnitaire, seuilAlerte, emplacement, fournisseurId } = req.body;

        if (reference !== undefined) piece.reference = reference;
        if (nom !== undefined) piece.nom = nom;
        if (description !== undefined) piece.description = description;
        if (prixUnitaire !== undefined) piece.prixUnitaire = parseFloat(prixUnitaire);
        if (seuilAlerte !== undefined) piece.seuilAlerte = parseInt(seuilAlerte);
        if (emplacement !== undefined) piece.emplacement = emplacement;
        if (fournisseurId !== undefined) piece.fournisseurId = fournisseurId;

        await piece.save();

        const result = await Piece.findByPk(piece.id, {
            include: [{ model: Fournisseur, as: 'fournisseur' }],
        });

        res.json(result);
    } catch (error) {
        console.error('Update piece error:', error);
        res.status(500).json({ error: 'Failed to update piece' });
    }
});

/**
 * PATCH /api/pieces/:id/stock
 * Adjust stock (entry or exit)
 */
router.patch('/:id/stock', authenticate, async (req, res) => {
    try {
        const piece = await Piece.findByPk(req.params.id);

        if (!piece) {
            return res.status(404).json({ error: 'Piece not found' });
        }

        const { type, quantite, motif } = req.body;
        const qty = parseInt(quantite);

        if (!['entree', 'sortie'].includes(type)) {
            return res.status(400).json({ error: 'Type must be "entree" or "sortie"' });
        }

        if (!qty || qty <= 0) {
            return res.status(400).json({ error: 'Quantite must be positive' });
        }

        const quantiteAvant = piece.quantiteStock;

        if (type === 'sortie') {
            if (qty > piece.quantiteStock) {
                return res.status(400).json({
                    error: `Stock insuffisant (disponible: ${piece.quantiteStock}, demandé: ${qty})`
                });
            }
            piece.quantiteStock -= qty;
        } else {
            piece.quantiteStock += qty;
        }

        await piece.save();

        // Record movement
        await MouvementStock.create({
            pieceId: piece.id,
            type,
            quantite: qty,
            quantiteAvant,
            quantiteApres: piece.quantiteStock,
            motif,
        });

        const result = await Piece.findByPk(piece.id, {
            include: [{ model: Fournisseur, as: 'fournisseur' }],
        });

        res.json(result);
    } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
});

/**
 * DELETE /api/pieces/:id
 * Delete piece
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const piece = await Piece.findByPk(req.params.id);

        if (!piece) {
            return res.status(404).json({ error: 'Piece not found' });
        }

        await piece.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete piece error:', error);
        res.status(500).json({ error: 'Failed to delete piece' });
    }
});

module.exports = router;
