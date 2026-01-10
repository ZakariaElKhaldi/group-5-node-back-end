/**
 * Role Model
 * Defines user roles with associated permissions
 * 
 * Roles can be:
 * - System (isSystem=true): Cannot be deleted, e.g., admin, user
 * - Custom (isSystem=false): Created by admins, can be deleted
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique role identifier (lowercase, no spaces)',
    },
    displayName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'display_name',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Array of permission keys',
    },
    isSystem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_system',
        comment: 'System roles cannot be deleted',
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'role',
    timestamps: false,
});

// Default system roles
Role.DEFAULTS = [
    {
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: ['*'], // All permissions
        isSystem: true,
    },
    {
        name: 'technician',
        displayName: 'Technician',
        description: 'Field technician with limited access',
        permissions: [
            'machines.read',
            'workorders.read',
            'workorders.update',
            'inventory.read',
        ],
        isSystem: true,
    },
    {
        name: 'receptionist',
        displayName: 'Receptionist',
        description: 'Front desk staff for client management',
        permissions: [
            'machines.read',
            'clients.read',
            'clients.create',
            'clients.update',
            'workorders.read',
            'workorders.create',
        ],
        isSystem: true,
    },
    {
        name: 'user',
        displayName: 'Basic User',
        description: 'Standard user with read-only access',
        permissions: [
            'machines.read',
            'workorders.read',
        ],
        isSystem: true,
    },
];

// Check if user has permission
Role.prototype.hasPermission = function (permissionKey) {
    // Admin has all permissions
    if (this.permissions.includes('*')) {
        return true;
    }
    return this.permissions.includes(permissionKey);
};

// Check if role has any of the given permissions
Role.prototype.hasAnyPermission = function (permissionKeys) {
    if (this.permissions.includes('*')) {
        return true;
    }
    return permissionKeys.some(key => this.permissions.includes(key));
};

// Seed default roles
Role.seed = async function () {
    for (const role of Role.DEFAULTS) {
        await Role.findOrCreate({
            where: { name: role.name },
            defaults: role,
        });
    }
};

module.exports = Role;
