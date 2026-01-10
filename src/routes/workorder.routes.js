const express = require('express');
const { authenticate, requireAdmin, requireRole } = require('../middleware/auth.middleware');
const { WorkOrder, Machine, Technicien, Client } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

/**
 * GET /api/workorders
 * List work orders with filtering and pagination
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const {
            status,
            type,
            priority,
            machineId,
            technicienId,
            search,
            limit = 50,
            page = 1,
        } = req.query;

        const where = {};

        if (status) where.status = status;
        if (type) where.type = type;
        if (priority) where.priority = priority;
        if (machineId) where.machineId = parseInt(machineId);
        if (technicienId) where.technicienId = parseInt(technicienId);
        if (search) {
            where[Op.or] = [
                { description: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const limitInt = parseInt(limit);
        const pageInt = parseInt(page);
        const offset = (pageInt - 1) * limitInt;

        const { count, rows } = await WorkOrder.findAndCountAll({
            where,
            include: [
                {
                    model: Machine,
                    as: 'machine',
                    include: [{ model: Client, as: 'client' }],
                },
                {
                    model: Technicien,
                    as: 'technicien',
                    include: [{
                        model: require('../models').User,
                        as: 'user',
                        attributes: ['nom', 'prenom', 'email']
                    }],
                },
            ],
            order: [['dateReported', 'DESC']],
            limit: limitInt,
            offset,
        });

        res.json({
            items: rows,
            total: count,
            page: pageInt,
            totalPages: Math.ceil(count / limitInt),
        });
    } catch (error) {
        console.error('Get work orders error:', error);
        res.status(500).json({ error: 'Failed to get work orders' });
    }
});

/**
 * GET /api/workorders/:id
 * Get single work order with details
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const workOrder = await WorkOrder.findByPk(req.params.id, {
            include: [
                {
                    model: Machine,
                    as: 'machine',
                    include: [{ model: Client, as: 'client' }],
                },
                {
                    model: Technicien,
                    as: 'technicien',
                },
            ],
        });

        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Calculate total cost
        const response = workOrder.toJSON();
        response.totalCost = workOrder.getTotalCost();

        res.json(response);
    } catch (error) {
        console.error('Get work order error:', error);
        res.status(500).json({ error: 'Failed to get work order' });
    }
});

/**
 * POST /api/workorders
 * Create new work order
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            machineId,
            type = 'corrective',
            origin = 'breakdown',
            priority = 'medium',
            severity,
            description,
            scheduledDate,
            estimatedDuration,
        } = req.body;

        // Validate required fields
        if (!machineId) {
            return res.status(400).json({ error: 'Machine ID is required' });
        }
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        // Verify machine exists
        const machine = await Machine.findByPk(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const workOrder = await WorkOrder.create({
            machineId,
            type,
            origin,
            priority,
            severity,
            description,
            scheduledDate,
            estimatedDuration,
            status: 'reported',
            dateReported: new Date(),
        });

        res.status(201).json(workOrder);
    } catch (error) {
        console.error('Create work order error:', error);
        res.status(500).json({ error: 'Failed to create work order' });
    }
});

/**
 * PUT /api/workorders/:id
 * Update work order
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const workOrder = await WorkOrder.findByPk(req.params.id);

        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        const allowedFields = [
            'priority', 'severity', 'description',
            'scheduledDate', 'estimatedDuration',
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        await workOrder.update(updates);

        res.json(workOrder);
    } catch (error) {
        console.error('Update work order error:', error);
        res.status(500).json({ error: 'Failed to update work order' });
    }
});

/**
 * PUT /api/workorders/:id/assign
 * Assign technician to work order
 */
router.put('/:id/assign', authenticate, requireRole('ROLE_ADMIN', 'ROLE_RECEPTIONIST'), async (req, res) => {
    try {
        const { technicienId } = req.body;

        const workOrder = await WorkOrder.findByPk(req.params.id);
        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Verify technician exists
        const technicien = await Technicien.findByPk(technicienId);
        if (!technicien) {
            return res.status(404).json({ error: 'Technician not found' });
        }

        await workOrder.update({
            technicienId,
            status: 'assigned',
        });

        res.json(workOrder);
    } catch (error) {
        console.error('Assign work order error:', error);
        res.status(500).json({ error: 'Failed to assign work order' });
    }
});

/**
 * PUT /api/workorders/:id/status
 * Update work order status with validation
 */
router.put('/:id/status', authenticate, async (req, res) => {
    try {
        const { status, resolution, laborCost, partsCost } = req.body;

        const workOrder = await WorkOrder.findByPk(req.params.id);
        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        // Validate status transition
        if (!WorkOrder.canTransitionTo(workOrder.status, status)) {
            return res.status(400).json({
                error: `Invalid status transition from '${workOrder.status}' to '${status}'`,
                allowedTransitions: WorkOrder.STATUS_TRANSITIONS[workOrder.status],
            });
        }

        const updates = { status };

        // Set dates based on status
        if (status === 'in_progress' && !workOrder.dateStarted) {
            updates.dateStarted = new Date();
        }
        if (status === 'completed') {
            updates.dateCompleted = new Date();
            if (resolution) updates.resolution = resolution;
            if (laborCost !== undefined) updates.laborCost = laborCost;
            if (partsCost !== undefined) updates.partsCost = partsCost;

            // Calculate actual duration
            if (workOrder.dateStarted) {
                const duration = Math.round(
                    (new Date() - new Date(workOrder.dateStarted)) / (1000 * 60)
                );
                updates.actualDuration = duration;
            }
        }

        await workOrder.update(updates);

        res.json(workOrder);
    } catch (error) {
        console.error('Update work order status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * POST /api/workorders/:id/signature
 * Add client signature to work order
 */
router.post('/:id/signature', authenticate, async (req, res) => {
    try {
        const { signature } = req.body;

        const workOrder = await WorkOrder.findByPk(req.params.id);
        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        await workOrder.update({
            signatureClient: signature,
            signatureClientAt: new Date(),
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Add signature error:', error);
        res.status(500).json({ error: 'Failed to add signature' });
    }
});

/**
 * DELETE /api/workorders/:id
 * Delete work order (admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const workOrder = await WorkOrder.findByPk(req.params.id);
        if (!workOrder) {
            return res.status(404).json({ error: 'Work order not found' });
        }

        await workOrder.destroy();

        res.json({ success: true });
    } catch (error) {
        console.error('Delete work order error:', error);
        res.status(500).json({ error: 'Failed to delete work order' });
    }
});

module.exports = router;
