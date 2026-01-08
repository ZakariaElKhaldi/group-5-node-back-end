const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nom: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    telephone: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    adresse: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    ice: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    rc: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    patente: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'client',
    timestamps: false,
});

module.exports = Client;
