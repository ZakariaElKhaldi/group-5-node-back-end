const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * NotificationRead Model
 * Junction table tracking which users have read which notifications
 */
const NotificationRead = sequelize.define('NotificationRead', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
    },
    notificationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'notification_id',
    },
    readAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'read_at',
    },
}, {
    tableName: 'notification_read',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'notification_id'],
        },
    ],
});

module.exports = NotificationRead;
