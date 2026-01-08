const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InterventionLog = sequelize.define('InterventionLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    interventionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'intervention_id',
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'comment',
        // Possible values: comment, status_change, note
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'intervention_log',
    timestamps: false,
});

module.exports = InterventionLog;
