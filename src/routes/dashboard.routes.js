const express = require('express');
const { Op, fn, col } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { Machine, WorkOrder, Technicien, sequelize } = require('../models');

const router = express.Router();

/**
 * GET /api/dashboard/stats
 * Get dashboard statistics using WorkOrder model
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

        // Urgent work orders (critical priority, not completed/cancelled)
        const urgentWorkOrders = await WorkOrder.count({
            where: {
                priority: 'critical',
                status: { [Op.notIn]: ['completed', 'cancelled'] },
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
        const currentWorkOrdersTotal = await WorkOrder.count({
            where: { dateReported: { [Op.gte]: startDateCurrent } },
        });

        // Calculate costs from labor + parts
        const currentCostsResult = await WorkOrder.findAll({
            attributes: [
                [fn('SUM', col('labor_cost')), 'laborTotal'],
                [fn('SUM', col('parts_cost')), 'partsTotal'],
            ],
            where: {
                status: 'completed',
                dateReported: { [Op.gte]: startDateCurrent },
            },
            raw: true,
        });
        const currentCostsTotal =
            (parseFloat(currentCostsResult[0]?.laborTotal) || 0) +
            (parseFloat(currentCostsResult[0]?.partsTotal) || 0);

        // Previous period stats
        const previousWorkOrdersTotal = await WorkOrder.count({
            where: {
                dateReported: { [Op.gte]: startDatePrevious, [Op.lt]: endDatePrevious },
            },
        });

        const previousCostsResult = await WorkOrder.findAll({
            attributes: [
                [fn('SUM', col('labor_cost')), 'laborTotal'],
                [fn('SUM', col('parts_cost')), 'partsTotal'],
            ],
            where: {
                status: 'completed',
                dateReported: { [Op.gte]: startDatePrevious, [Op.lt]: endDatePrevious },
            },
            raw: true,
        });
        const previousCostsTotal =
            (parseFloat(previousCostsResult[0]?.laborTotal) || 0) +
            (parseFloat(previousCostsResult[0]?.partsTotal) || 0);

        // Global stats
        const totalWorkOrders = await WorkOrder.count();
        const totalCostsResult = await WorkOrder.findAll({
            attributes: [
                [fn('SUM', col('labor_cost')), 'laborTotal'],
                [fn('SUM', col('parts_cost')), 'partsTotal'],
            ],
            where: { status: 'completed' },
            raw: true,
        });
        const totalCosts =
            (parseFloat(totalCostsResult[0]?.laborTotal) || 0) +
            (parseFloat(totalCostsResult[0]?.partsTotal) || 0);

        res.json({
            machines: {
                byStatus: machinesByStatus,
                total: machinesByStatus.reduce((sum, m) => sum + parseInt(m.count), 0),
            },
            interventions: {
                total: totalWorkOrders,
                urgent: urgentWorkOrders,
                currentPeriod: currentWorkOrdersTotal,
                previousPeriod: previousWorkOrdersTotal,
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
 * Get chart data using WorkOrder model
 */
router.get('/charts', authenticate, async (req, res) => {
    try {
        // Work orders by month (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const workOrdersByMonth = await sequelize.query(
            `SELECT TO_CHAR(date_reported, 'YYYY-MM') as month, COUNT(id) as count 
             FROM work_order 
             WHERE date_reported >= :startDate 
             GROUP BY month 
             ORDER BY month ASC`,
            {
                replacements: { startDate: twelveMonthsAgo },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        // Work orders by type (corrective, preventive, inspection)
        const workOrdersByType = await WorkOrder.findAll({
            attributes: ['type', [fn('COUNT', col('id')), 'count']],
            group: ['type'],
            raw: true,
        });

        // Capitalize type names for display
        const formattedByType = workOrdersByType.map(item => ({
            type: item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Unknown',
            count: parseInt(item.count),
        }));

        // Work orders by status (for status distribution chart)
        const workOrdersByStatus = await WorkOrder.findAll({
            attributes: ['status', [fn('COUNT', col('id')), 'count']],
            group: ['status'],
            raw: true,
        });

        const statusLabels = {
            'reported': 'Signalé',
            'assigned': 'Assigné',
            'in_progress': 'En cours',
            'pending_parts': 'Attente pièces',
            'completed': 'Terminé',
            'cancelled': 'Annulé',
        };

        const formattedByStatus = workOrdersByStatus.map(item => ({
            status: statusLabels[item.status] || item.status,
            count: parseInt(item.count),
        }));

        // Top 5 machines with most work orders - use raw query to avoid Sequelize issues
        let topMachines = [];
        try {
            topMachines = await sequelize.query(
                `SELECT m.reference, m.modele, COUNT(w.id) as intervention_count
                 FROM work_order w
                 JOIN machine m ON w.machine_id = m.id
                 GROUP BY m.id, m.reference, m.modele
                 ORDER BY intervention_count DESC
                 LIMIT 5`,
                { type: sequelize.QueryTypes.SELECT }
            );
        } catch (e) {
            console.error('Top machines query error:', e);
        }

        res.json({
            interventionsByMonth: workOrdersByMonth,
            interventionsByType: formattedByType,
            interventionsByStatus: formattedByStatus,
            topMachines: topMachines.map(t => ({
                reference: t.reference || 'N/A',
                modele: t.modele || 'N/A',
                interventionCount: parseInt(t.intervention_count) || 0,
            })),
        });
    } catch (error) {
        console.error('Get charts error:', error);
        res.status(500).json({ error: 'Failed to get charts' });
    }
});

module.exports = router;
