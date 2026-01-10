/**
 * Permission Model
 * Defines granular permissions in format: resource.action
 * e.g., 'machines.create', 'workorders.update', 'users.delete'
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique permission key in resource.action format',
    },
    displayName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'display_name',
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Resource category for grouping (machines, users, etc.)',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
}, {
    tableName: 'permission',
    timestamps: false,
});

// Default permissions to seed
Permission.DEFAULTS = [
    // Machines
    { key: 'machines.read', displayName: 'View Machines', category: 'machines', description: 'Can view machine list and details' },
    { key: 'machines.create', displayName: 'Create Machines', category: 'machines', description: 'Can create new machines' },
    { key: 'machines.update', displayName: 'Update Machines', category: 'machines', description: 'Can update machine information' },
    { key: 'machines.delete', displayName: 'Delete Machines', category: 'machines', description: 'Can delete machines' },

    // Work Orders
    { key: 'workorders.read', displayName: 'View Work Orders', category: 'workorders', description: 'Can view work orders' },
    { key: 'workorders.create', displayName: 'Create Work Orders', category: 'workorders', description: 'Can create work orders' },
    { key: 'workorders.update', displayName: 'Update Work Orders', category: 'workorders', description: 'Can update work orders' },
    { key: 'workorders.delete', displayName: 'Delete Work Orders', category: 'workorders', description: 'Can delete work orders' },
    { key: 'workorders.assign', displayName: 'Assign Work Orders', category: 'workorders', description: 'Can assign work orders to technicians' },

    // Clients
    { key: 'clients.read', displayName: 'View Clients', category: 'clients', description: 'Can view client list' },
    { key: 'clients.create', displayName: 'Create Clients', category: 'clients', description: 'Can create clients' },
    { key: 'clients.update', displayName: 'Update Clients', category: 'clients', description: 'Can update clients' },
    { key: 'clients.delete', displayName: 'Delete Clients', category: 'clients', description: 'Can delete clients' },

    // Inventory (Pieces)
    { key: 'inventory.read', displayName: 'View Inventory', category: 'inventory', description: 'Can view inventory' },
    { key: 'inventory.create', displayName: 'Create Parts', category: 'inventory', description: 'Can add parts to inventory' },
    { key: 'inventory.update', displayName: 'Update Parts', category: 'inventory', description: 'Can update part information' },
    { key: 'inventory.delete', displayName: 'Delete Parts', category: 'inventory', description: 'Can remove parts from inventory' },
    { key: 'inventory.adjust', displayName: 'Adjust Stock', category: 'inventory', description: 'Can adjust stock levels' },

    // Technicians
    { key: 'technicians.read', displayName: 'View Technicians', category: 'technicians', description: 'Can view technician list' },
    { key: 'technicians.create', displayName: 'Create Technicians', category: 'technicians', description: 'Can create technicians' },
    { key: 'technicians.update', displayName: 'Update Technicians', category: 'technicians', description: 'Can update technicians' },
    { key: 'technicians.delete', displayName: 'Delete Technicians', category: 'technicians', description: 'Can delete technicians' },

    // Users & Admin
    { key: 'users.read', displayName: 'View Users', category: 'admin', description: 'Can view user list' },
    { key: 'users.create', displayName: 'Create Users', category: 'admin', description: 'Can create new users' },
    { key: 'users.update', displayName: 'Update Users', category: 'admin', description: 'Can update user information' },
    { key: 'users.delete', displayName: 'Delete Users', category: 'admin', description: 'Can deactivate users' },
    { key: 'roles.manage', displayName: 'Manage Roles', category: 'admin', description: 'Can create and modify roles' },
    { key: 'settings.manage', displayName: 'Manage Settings', category: 'admin', description: 'Can modify system settings' },
    { key: 'reports.view', displayName: 'View Reports', category: 'admin', description: 'Can view reports and analytics' },
];

// Seed default permissions
Permission.seed = async function () {
    for (const perm of Permission.DEFAULTS) {
        await Permission.findOrCreate({
            where: { key: perm.key },
            defaults: perm,
        });
    }
};

module.exports = Permission;
