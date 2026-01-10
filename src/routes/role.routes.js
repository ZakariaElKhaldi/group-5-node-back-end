/**
 * Role & Permission Routes
 * Admin-only endpoints for managing RBAC
 */

const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { Role, Permission, User } = require('../models');

const router = express.Router();

// ==========================================
// PERMISSION ROUTES
// ==========================================

/**
 * GET /api/permissions
 * List all available permissions
 */
router.get('/permissions', authenticate, requireAdmin, async (req, res) => {
    try {
        const permissions = await Permission.findAll({
            order: [['category', 'ASC'], ['key', 'ASC']],
        });

        if (req.query.grouped === 'true') {
            // Group permissions by category
            const grouped = permissions.reduce((acc, perm) => {
                if (!acc[perm.category]) {
                    acc[perm.category] = [];
                }
                acc[perm.category].push(perm);
                return acc;
            }, {});
            return res.json(grouped);
        }

        res.json(permissions);
    } catch (error) {
        console.error('List permissions error:', error);
        res.status(500).json({ error: 'Failed to list permissions' });
    }
});

// ==========================================
// ROLE ROUTES
// ==========================================

/**
 * GET /api/roles
 * List all roles with permissions
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const roles = await Role.findAll({
            order: [['isSystem', 'DESC'], ['name', 'ASC']],
        });

        res.json(roles);
    } catch (error) {
        console.error('List roles error:', error);
        res.status(500).json({ error: 'Failed to list roles' });
    }
});

/**
 * GET /api/roles/:id
 * Get role by ID with permissions
 */
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.json(role);
    } catch (error) {
        console.error('Get role error:', error);
        res.status(500).json({ error: 'Failed to get role' });
    }
});

/**
 * POST /api/roles
 * Create a new custom role
 */
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { name, displayName, description, permissions } = req.body;

        if (!name || !displayName) {
            return res.status(400).json({ error: 'Name and displayName are required' });
        }

        // Validate name format (lowercase, no spaces)
        const nameRegex = /^[a-z][a-z0-9_]*$/;
        if (!nameRegex.test(name)) {
            return res.status(400).json({
                error: 'Name must be lowercase, start with a letter, and contain only letters, numbers, and underscores'
            });
        }

        // Check for duplicate
        const existing = await Role.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ error: 'Role with this name already exists' });
        }

        // Validate permissions
        const validPermissions = permissions?.filter(p =>
            Permission.DEFAULTS.some(d => d.key === p)
        ) || [];

        const role = await Role.create({
            name,
            displayName,
            description: description || '',
            permissions: validPermissions,
            isSystem: false,
        });

        res.status(201).json(role);
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ error: 'Failed to create role' });
    }
});

/**
 * PUT /api/roles/:id
 * Update role (cannot modify system roles)
 */
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent modification of system roles
        if (role.isSystem) {
            return res.status(403).json({ error: 'Cannot modify system roles' });
        }

        const { displayName, description, permissions } = req.body;

        if (displayName !== undefined) role.displayName = displayName;
        if (description !== undefined) role.description = description;
        if (permissions !== undefined) {
            // Validate permissions
            role.permissions = permissions.filter(p =>
                Permission.DEFAULTS.some(d => d.key === p)
            );
        }

        await role.save();

        res.json(role);
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

/**
 * DELETE /api/roles/:id
 * Delete custom role (cannot delete system roles)
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);

        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }

        // Prevent deletion of system roles
        if (role.isSystem) {
            return res.status(403).json({ error: 'Cannot delete system roles' });
        }

        // Check if any users have this role
        const usersWithRole = await User.count({ where: { roleId: role.id } });
        if (usersWithRole > 0) {
            return res.status(400).json({
                error: `Cannot delete role. ${usersWithRole} user(s) have this role assigned.`
            });
        }

        await role.destroy();

        res.status(204).send();
    } catch (error) {
        console.error('Delete role error:', error);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

module.exports = router;
