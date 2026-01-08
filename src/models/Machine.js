const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Machine = sequelize.define('Machine', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    reference: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    modele: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    marque: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    dateAcquisition: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'date_acquisition',
    },
    statut: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'En service',
        // Possible values: En service, En maintenance, Hors service
    },
    clientId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'client_id',
    },
}, {
    tableName: 'machine',
    timestamps: false,
});

module.exports = Machine;
