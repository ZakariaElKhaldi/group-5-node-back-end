const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { MouvementStock, Piece } = require('../models');

const router = express.Router();

/**
 * GET /api/mouvements-stock
 * List stock movements with pagination and filters
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const pieceId = req.query.pieceId;
        const type = req.query.type; // 'entree' or 'sortie'
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const offset = (page - 1) * limit;

        const where = {};
        if (pieceId) where.pieceId = parseInt(pieceId);
        if (type) where.type = type;
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
        }

        const { count, rows } = await MouvementStock.findAndCountAll({
            where,
            include: [{
                model: Piece,
                as: 'piece',
                attributes: ['id', 'reference', 'nom']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        res.json({
            items: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('List mouvements stock error:', error);
        res.status(500).json({ error: 'Failed to list stock movements' });
    }
});

/**
 * GET /api/mouvements-stock/summary
 * Get summary stats for stock movements
 */
router.get('/summary', authenticate, async (req, res) => {
    try {
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;

        const where = {};
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
        }

        const entries = await MouvementStock.findAll({
            where: { ...where, type: 'entree' },
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('quantite')), 'totalQuantite'],
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalCount']
            ]
        });

        const exits = await MouvementStock.findAll({
            where: { ...where, type: 'sortie' },
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('quantite')), 'totalQuantite'],
                [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalCount']
            ]
        });

        res.json({
            entries: {
                totalQuantite: parseInt(entries[0]?.dataValues?.totalQuantite) || 0,
                totalCount: parseInt(entries[0]?.dataValues?.totalCount) || 0
            },
            exits: {
                totalQuantite: parseInt(exits[0]?.dataValues?.totalQuantite) || 0,
                totalCount: parseInt(exits[0]?.dataValues?.totalCount) || 0
            }
        });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ error: 'Failed to get summary' });
    }
});

module.exports = router;
