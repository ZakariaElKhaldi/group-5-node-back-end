const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Notification Model
 * Stores system notifications that can be targeted to specific roles
 */
const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    titre: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'info',
        validate: {
            isIn: [['info', 'warning', 'alert', 'success']],
        },
    },
    targetRole: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Target specific role (null = all users)',
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'notification',
    timestamps: false,
});

module.exports = Notification;
