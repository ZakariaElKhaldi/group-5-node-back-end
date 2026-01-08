const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { Machine, Intervention, Technicien, sequelize } = require('../models');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const period = req.query.period || 'month';

        // Machine counts by status
        const machinesByStatus = await Machine.findAll({
            attributes: ['statut', [fn('COUNT', col('id')), 'count']],
            group: ['statut'],
            raw: true,
        });

        // Available technicians
        const availableTechniciens = await Technicien.count({
            where: { statut: 'Disponible' },
        });

        // Urgent interventions
        const urgentInterventions = await Intervention.count({
            where: {
                priorite: 'Urgente',
                statut: { [Op.in]: ['En attente', 'En cours'] },
            },
        });

        // Period comparison
        const now = new Date();
        let startDateCurrent, startDatePrevious, endDatePrevious;

        if (period === 'year') {
            startDateCurrent = new Date(now.getFullYear(), 0, 1);
            startDatePrevious = new Date(now.getFullYear() - 1, 0, 1);
            endDatePrevious = new Date(now.getFullYear(), 0, 1);
        } else if (period === 'quarter') {
            startDateCurrent = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            startDatePrevious = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            endDatePrevious = startDateCurrent;
        } else {
            startDateCurrent = new Date(now.getFullYear(), now.getMonth(), 1);
            startDatePrevious = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDatePrevious = startDateCurrent;
        }

        // Current period stats
        const currentInterventionsTotal = await Intervention.count({
            where: { dateDebut: { [Op.gte]: startDateCurrent } },
        });

        const currentCostsResult = await Intervention.findAll({
            attributes: [[fn('SUM', col('cout_total')), 'total']],
            where: {
                statut: 'Terminee',
                dateDebut: { [Op.gte]: startDateCurrent },
            },
            raw: true,
        });
        const currentCostsTotal = parseFloat(currentCostsResult[0]?.total) || 0;

        // Previous period stats
        const previousInterventionsTotal = await Intervention.count({
            where: {
                dateDebut: { [Op.gte]: startDatePrevious, [Op.lt]: endDatePrevious },
            },
        });

        const previousCostsResult = await Intervention.findAll({
            attributes: [[fn('SUM', col('cout_total')), 'total']],
            where: {
                statut: 'Terminee',
                dateDebut: { [Op.gte]: startDatePrevious, [Op.lt]: endDatePrevious },
            },
            raw: true,
        });
        const previousCostsTotal = parseFloat(previousCostsResult[0]?.total) || 0;

        // Global stats
        const totalInterventions = await Intervention.count();
        const totalCostsResult = await Intervention.findAll({
            attributes: [[fn('SUM', col('cout_total')), 'total']],
            where: { statut: 'Terminee' },
            raw: true,
        });
        const totalCosts = parseFloat(totalCostsResult[0]?.total) || 0;

        res.json({
            machines: {
                byStatus: machinesByStatus,
                total: machinesByStatus.reduce((sum, m) => sum + parseInt(m.count), 0),
            },
            interventions: {
                total: totalInterventions,
                urgent: urgentInterventions,
                currentPeriod: currentInterventionsTotal,
                previousPeriod: previousInterventionsTotal,
            },
            techniciens: {
                available: availableTechniciens,
            },
            costs: {
                total: Math.round(totalCosts * 100) / 100,
                currentPeriod: Math.round(currentCostsTotal * 100) / 100,
                previousPeriod: Math.round(previousCostsTotal * 100) / 100,
            },
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * GET /api/dashboard/charts
 * Get chart data
 */
router.get('/charts', authenticate, async (req, res) => {
    try {
        // Interventions by month (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const interventionsByMonth = await sequelize.query(
            `SELECT DATE_FORMAT(date_debut, '%Y-%m') as month, COUNT(id) as count 
       FROM intervention 
       WHERE date_debut >= :startDate 
       GROUP BY month 
       ORDER BY month ASC`,
            {
                replacements: { startDate: twelveMonthsAgo },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        // Interventions by type
        const interventionsByType = await Intervention.findAll({
            attributes: ['type', [fn('COUNT', col('id')), 'count']],
            group: ['type'],
            raw: true,
        });

        // Top 5 machines with most interventions
        const topMachines = await Intervention.findAll({
            attributes: [
                [fn('COUNT', col('Intervention.id')), 'interventionCount'],
            ],
            include: [{
                model: Machine,
                as: 'machine',
                attributes: ['reference', 'modele'],
            }],
            group: ['machine.id'],
            order: [[literal('interventionCount'), 'DESC']],
            limit: 5,
            raw: true,
            nest: true,
        });

        res.json({
            interventionsByMonth,
            interventionsByType,
            topMachines: topMachines.map(t => ({
                reference: t.machine.reference,
                modele: t.machine.modele,
                interventionCount: parseInt(t.interventionCount),
            })),
        });
    } catch (error) {
        console.error('Get charts error:', error);
        res.status(500).json({ error: 'Failed to get charts' });
    }
});

module.exports = router;
