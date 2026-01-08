const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Technicien = sequelize.define('Technicien', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: 'user_id',
    },
    specialite: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    tauxHoraire: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        field: 'taux_horaire',
    },
    statut: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Disponible',
        // Possible values: Disponible, En intervention, Absent
    },
}, {
    tableName: 'technicien',
    timestamps: false,
});

module.exports = Technicien;
