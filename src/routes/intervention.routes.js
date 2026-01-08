const express = require('express');
const { Op } = require('sequelize');
const { authenticate } = require('../middleware/auth.middleware');
const { requireReceptionist, requireAdmin } = require('../middleware/roles.middleware');
const { Intervention, Machine, Technicien, User, Panne, InterventionLog, PieceIntervention, Piece } = require('../models');

const router = express.Router();

/**
 * GET /api/interventions
 * List interventions with pagination and filters
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const statut = req.query.statut;
        const priorite = req.query.priorite;
        const technicienId = parseInt(req.query.technicien) || 0;
        const offset = (page - 1) * limit;

        const where = {};
        if (statut) where.statut = statut;
        if (priorite) where.priorite = priorite;

        // For technician filter: show assigned or unassigned
        if (technicienId > 0) {
            where[Op.or] = [
                { technicienId: technicienId },
                { technicienId: null },
            ];
        }

        const include = [
            { model: Machine, as: 'machine', attributes: ['id', 'reference', 'modele', 'statut'] },
            {
                model: Technicien, as: 'technicien',
                include: [{ model: User, as: 'user', attributes: ['nom', 'prenom', 'email'] }]
            },
        ];

        // Add search condition
        if (search) {
            where[Op.or] = [
                { description: { [Op.like]: `%${search}%` } },
                { '$machine.reference$': { [Op.like]: `%${search}%` } },
                { '$machine.modele$': { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await Intervention.findAndCountAll({
            where,
            include,
            limit,
            offset,
            order: [['dateDebut', 'DESC']],
            subQuery: false,
        });

        res.json({
            items: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        });
    } catch (error) {
        console.error('List interventions error:', error);
        res.status(500).json({ error: 'Failed to list interventions' });
    }
});

/**
 * GET /api/interventions/:id
 * Get single intervention by ID
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id, {
            include: [
                { model: Machine, as: 'machine', include: [{ model: require('../models').Client, as: 'client' }] },
                { model: Technicien, as: 'technicien', include: [{ model: User, as: 'user' }] },
                { model: InterventionLog, as: 'logs', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] },
                { model: PieceIntervention, as: 'pieceInterventions', include: [{ model: Piece, as: 'piece' }] },
            ],
        });

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        res.json(intervention);
    } catch (error) {
        console.error('Get intervention error:', error);
        res.status(500).json({ error: 'Failed to get intervention' });
    }
});

/**
 * POST /api/interventions
 * Create new intervention
 */
router.post('/', authenticate, requireReceptionist, async (req, res) => {
    try {
        const { machineId, technicienId, type, priorite, dateDebut, dateFinPrevue, description, panneDescription, panneGravite, coutPieces } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId is required' });
        }

        const machine = await Machine.findByPk(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        // Create intervention
        const intervention = await Intervention.create({
            machineId,
            technicienId: technicienId || null,
            type: type || 'corrective',
            priorite: priorite || 'Normale',
            statut: 'En attente',
            dateDebut: dateDebut || new Date(),
            dateFinPrevue,
            description,
            coutPieces: coutPieces || null,
        });

        // If technician assigned, freeze their hourly rate
        if (technicienId) {
            const technicien = await Technicien.findByPk(technicienId);
            if (technicien) {
                intervention.tauxHoraireApplique = technicien.tauxHoraire;
                await intervention.save();
            }
        }

        // If corrective, create linked Panne
        if (intervention.type === 'corrective') {
            await Panne.create({
                machineId,
                interventionId: intervention.id,
                dateDeclaration: new Date(),
                description: panneDescription || description || 'Panne signalée',
                gravite: panneGravite || 'Moyenne',
                statut: 'Declaree',
            });
        }

        // Reload with associations
        const result = await Intervention.findByPk(intervention.id, {
            include: [
                { model: Machine, as: 'machine' },
                { model: Technicien, as: 'technicien', include: [{ model: User, as: 'user' }] },
            ],
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create intervention error:', error);
        res.status(500).json({ error: 'Failed to create intervention' });
    }
});

/**
 * PUT /api/interventions/:id
 * Update intervention
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id);

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        const { description, resolution, priorite, dateFinPrevue, coutPieces, technicienId } = req.body;

        if (description !== undefined) intervention.description = description;
        if (resolution !== undefined) intervention.resolution = resolution;
        if (priorite !== undefined) intervention.priorite = priorite;
        if (dateFinPrevue !== undefined) intervention.dateFinPrevue = dateFinPrevue;
        if (coutPieces !== undefined) intervention.coutPieces = coutPieces;

        if (technicienId !== undefined) {
            intervention.technicienId = technicienId;
            if (technicienId && !intervention.tauxHoraireApplique) {
                const technicien = await Technicien.findByPk(technicienId);
                if (technicien) {
                    intervention.tauxHoraireApplique = technicien.tauxHoraire;
                }
            }

            // Update linked panne status
            const panne = await Panne.findOne({ where: { interventionId: intervention.id } });
            if (panne && panne.statut === 'Declaree') {
                panne.statut = 'En traitement';
                await panne.save();
            }
        }

        await intervention.save();

        // Reload with associations
        const result = await Intervention.findByPk(intervention.id, {
            include: [
                { model: Machine, as: 'machine' },
                { model: Technicien, as: 'technicien', include: [{ model: User, as: 'user' }] },
            ],
        });

        res.json(result);
    } catch (error) {
        console.error('Update intervention error:', error);
        res.status(500).json({ error: 'Failed to update intervention' });
    }
});

/**
 * PATCH /api/interventions/:id/status
 * Update intervention status (with state machine validation)
 */
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id, {
            include: [
                { model: Machine, as: 'machine' },
                { model: Technicien, as: 'technicien' },
            ],
        });

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        const { statut } = req.body;

        if (!statut || !Intervention.VALID_STATUSES.includes(statut)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        if (!intervention.canTransitionTo(statut)) {
            const allowed = Intervention.STATUS_TRANSITIONS[intervention.statut] || [];
            return res.status(400).json({
                error: `Cannot transition from '${intervention.statut}' to '${statut}'`,
                allowed,
            });
        }

        intervention.statut = statut;
        const machine = intervention.machine;

        // Handle status-specific logic
        switch (statut) {
            case 'En cours':
                machine.statut = 'En maintenance';
                await machine.save();
                if (intervention.technicien) {
                    intervention.technicien.statut = 'En intervention';
                    await intervention.technicien.save();
                }
                break;

            case 'Terminee':
                intervention.dateFinReelle = new Date();
                intervention.calculateCosts();
                machine.statut = 'En service';
                await machine.save();
                if (intervention.technicien) {
                    intervention.technicien.statut = 'Disponible';
                    await intervention.technicien.save();
                }
                // Mark linked panne as resolved
                const panne = await Panne.findOne({ where: { interventionId: intervention.id } });
                if (panne && panne.statut !== 'Resolue') {
                    panne.statut = 'Resolue';
                    await panne.save();
                }
                break;

            case 'Annulee':
                // Check if machine has other active interventions
                const activeCount = await Intervention.count({
                    where: {
                        machineId: machine.id,
                        statut: { [Op.in]: ['En attente', 'En cours'] },
                        id: { [Op.ne]: intervention.id },
                    },
                });
                if (activeCount === 0) {
                    machine.statut = 'En service';
                    await machine.save();
                }
                if (intervention.technicien) {
                    intervention.technicien.statut = 'Disponible';
                    await intervention.technicien.save();
                }
                break;
        }

        await intervention.save();

        // Reload with associations
        const result = await Intervention.findByPk(intervention.id, {
            include: [
                { model: Machine, as: 'machine' },
                { model: Technicien, as: 'technicien', include: [{ model: User, as: 'user' }] },
            ],
        });

        res.json(result);
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

/**
 * PATCH /api/interventions/:id/confirm-tech
 * Technician confirmation
 */
router.patch('/:id/confirm-tech', authenticate, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id);

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        intervention.confirmationTechnicien = true;
        intervention.confirmationTechnicienAt = new Date();
        await intervention.save();

        res.json(intervention);
    } catch (error) {
        console.error('Confirm tech error:', error);
        res.status(500).json({ error: 'Failed to confirm' });
    }
});

/**
 * PATCH /api/interventions/:id/confirm-client
 * Client confirmation
 */
router.patch('/:id/confirm-client', authenticate, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id);

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        intervention.confirmationClient = true;
        intervention.confirmationClientAt = new Date();
        await intervention.save();

        res.json(intervention);
    } catch (error) {
        console.error('Confirm client error:', error);
        res.status(500).json({ error: 'Failed to confirm' });
    }
});

/**
 * POST /api/interventions/:id/logs
 * Add log entry
 */
router.post('/:id/logs', authenticate, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id);

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        const { message, type } = req.body;

        await InterventionLog.create({
            interventionId: intervention.id,
            userId: req.user.id,
            message: message || '',
            type: type || 'comment',
        });

        // Reload intervention with logs
        const result = await Intervention.findByPk(intervention.id, {
            include: [
                { model: InterventionLog, as: 'logs', include: [{ model: User, as: 'user', attributes: ['nom', 'prenom'] }] },
            ],
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Add log error:', error);
        res.status(500).json({ error: 'Failed to add log' });
    }
});

/**
 * POST /api/interventions/:id/sign
 * Client signature
 */
router.post('/:id/sign', authenticate, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id);

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        const { signature, signerNom } = req.body;

        intervention.signatureClient = signature;
        intervention.signerNom = signerNom;
        intervention.confirmationClient = true;
        intervention.confirmationClientAt = new Date();
        await intervention.save();

        res.json(intervention);
    } catch (error) {
        console.error('Sign error:', error);
        res.status(500).json({ error: 'Failed to sign' });
    }
});

/**
 * DELETE /api/interventions/:id
 * Delete intervention
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const intervention = await Intervention.findByPk(req.params.id);

        if (!intervention) {
            return res.status(404).json({ error: 'Intervention not found' });
        }

        await intervention.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete intervention error:', error);
        res.status(500).json({ error: 'Failed to delete intervention' });
    }
});

module.exports = router;
