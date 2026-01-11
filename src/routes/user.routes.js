/**
 * User Management Routes
 * Admin endpoints for managing users and role assignments
 */

const express = require('express');
const { Op } = require('sequelize');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { User, Role, Technicien } = require('../models');

const router = express.Router();

/**
 * GET /api/users
 * List all users with pagination and search
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where[Op.or] = [
                { email: { [Op.like]: `%${search}%` } },
                { nom: { [Op.like]: `%${search}%` } },
                { prenom: { [Op.like]: `%${search}%` } },
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            include: [
                { model: Role, as: 'role', attributes: ['id', 'name', 'displayName'] },
                { model: Technicien, as: 'technicien', attributes: ['id', 'specialite', 'tauxHoraire', 'statut'] },
            ],
            attributes: { exclude: ['password'] },
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
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [
                { model: Role, as: 'role' },
                { model: Technicien, as: 'technicien' },
            ],
            attributes: { exclude: ['password'] },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { email, password, nom, prenom, roleId, roles } = req.body;

        if (!email || !password || !nom || !prenom) {
            return res.status(400).json({ error: 'Email, password, nom, and prenom are required' });
        }

        // Check for duplicate email
        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Validate roleId if provided
        if (roleId) {
            const role = await Role.findByPk(roleId);
            if (!role) {
                return res.status(400).json({ error: 'Invalid role ID' });
            }
        }

        const user = await User.create({
            email,
            password,
            nom,
            prenom,
            roleId: roleId || null,
            roles: roles || ['ROLE_USER'],
        });

        // Reload without password
        const result = await User.findByPk(user.id, {
            include: [{ model: Role, as: 'role' }],
            attributes: { exclude: ['password'] },
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * PUT /api/users/:id
 * Update user information
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { email, nom, prenom, password, roles } = req.body;

        // Check email uniqueness if changing
        if (email && email !== user.email) {
            const existing = await User.findOne({ where: { email } });
            if (existing) {
                return res.status(400).json({ error: 'Email already in use' });
            }
            user.email = email;
        }

        if (nom !== undefined) user.nom = nom;
        if (prenom !== undefined) user.prenom = prenom;
        if (roles !== undefined) user.roles = roles;
        if (password) user.password = password; // Will be hashed by hook

        await user.save();

        const result = await User.findByPk(user.id, {
            include: [{ model: Role, as: 'role' }],
            attributes: { exclude: ['password'] },
        });

        res.json(result);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * PUT /api/users/:id/role
 * Assign role to user
 */
router.put('/:id/role', authenticate, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { roleId } = req.body;

        if (roleId !== null && roleId !== undefined) {
            const role = await Role.findByPk(roleId);
            if (!role) {
                return res.status(400).json({ error: 'Invalid role ID' });
            }
        }

        user.roleId = roleId;
        await user.save();

        const result = await User.findByPk(user.id, {
            include: [{ model: Role, as: 'role' }],
            attributes: { exclude: ['password'] },
        });

        res.json(result);
    } catch (error) {
        console.error('Assign role error:', error);
        res.status(500).json({ error: 'Failed to assign role' });
    }
});

/**
 * DELETE /api/users/:id
 * Delete user (deactivate)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent self-deletion
        if (user.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await user.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
