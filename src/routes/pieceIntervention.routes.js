const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { PieceIntervention, Piece, Intervention, MouvementStock } = require('../models');

const router = express.Router();

/**
 * GET /api/piece-interventions
 * List all piece interventions
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const interventionId = parseInt(req.query.interventionId);

        const where = {};
        if (interventionId) where.interventionId = interventionId;

        const pieceInterventions = await PieceIntervention.findAll({
            where,
            include: [
                { model: Piece, as: 'piece' },
                { model: Intervention, as: 'intervention' },
            ],
            order: [['dateUtilisation', 'DESC']],
        });

        res.json(pieceInterventions);
    } catch (error) {
        console.error('List piece interventions error:', error);
        res.status(500).json({ error: 'Failed to list piece interventions' });
    }
});

/**
 * POST /api/piece-interventions
 * Add piece to intervention (deducts stock)
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { pieceId, interventionId, quantite } = req.body;
        const qty = parseInt(quantite);

        if (!pieceId || !interventionId || !qty || qty <= 0) {
            return res.status(400).json({ error: 'pieceId, interventionId and positive quantite required' });
        }

        const piece = await Piece.findByPk(pieceId);
        if (!piece) {
            return res.status(404).json({ error: 'Piece not found' });
        }

        const intervention = await Intervention.findByPk(interventionId);
        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        // Check stock
        if (qty > piece.quantiteStock) {
            return res.status(400).json({
                error: `Stock insuffisant (disponible: ${piece.quantiteStock}, demandé: ${qty})`,
            });
        }

        // Create piece intervention
        const pieceIntervention = await PieceIntervention.create({
            pieceId,
            interventionId,
            quantite: qty,
            prixUnitaireApplique: piece.prixUnitaire,
            dateUtilisation: new Date(),
        });

        // Deduct stock
        const quantiteAvant = piece.quantiteStock;
        piece.quantiteStock -= qty;
        await piece.save();

        // Record stock movement
        await MouvementStock.create({
            pieceId: piece.id,
            type: 'sortie',
            quantite: qty,
            quantiteAvant,
            quantiteApres: piece.quantiteStock,
            motif: `Intervention #${interventionId}`,
        });

        // Update intervention cost
        const totalPiecesCost = await PieceIntervention.sum(
            require('sequelize').literal('quantite * prix_unitaire_applique'),
            { where: { interventionId } }
        );
        intervention.coutPieces = totalPiecesCost || 0;
        intervention.coutTotal = (intervention.coutMainOeuvre || 0) + intervention.coutPieces;
        await intervention.save();

        const result = await PieceIntervention.findByPk(pieceIntervention.id, {
            include: [{ model: Piece, as: 'piece' }],
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Add piece to intervention error:', error);
        res.status(500).json({ error: 'Failed to add piece' });
    }
});

/**
 * DELETE /api/piece-interventions/:id
 * Remove piece from intervention (restores stock)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const pieceIntervention = await PieceIntervention.findByPk(req.params.id, {
            include: [
                { model: Piece, as: 'piece' },
                { model: Intervention, as: 'intervention' },
            ],
        });

        if (!pieceIntervention) {
            return res.status(404).json({ error: 'PieceIntervention not found' });
        }

        // Restore stock
        const piece = pieceIntervention.piece;
        const quantiteAvant = piece.quantiteStock;
        piece.quantiteStock += pieceIntervention.quantite;
        await piece.save();

        // Record stock movement
        await MouvementStock.create({
            pieceId: piece.id,
            type: 'entree',
            quantite: pieceIntervention.quantite,
            quantiteAvant,
            quantiteApres: piece.quantiteStock,
            motif: `Annulation intervention #${pieceIntervention.interventionId}`,
        });

        const intervention = pieceIntervention.intervention;
        await pieceIntervention.destroy();

        // Update intervention cost
        const totalPiecesCost = await PieceIntervention.sum(
            require('sequelize').literal('quantite * prix_unitaire_applique'),
            { where: { interventionId: intervention.id } }
        );
        intervention.coutPieces = totalPiecesCost || 0;
        intervention.coutTotal = (intervention.coutMainOeuvre || 0) + intervention.coutPieces;
        await intervention.save();

        res.status(204).send();
    } catch (error) {
        console.error('Remove piece from intervention error:', error);
        res.status(500).json({ error: 'Failed to remove piece' });
    }
});

module.exports = router;
