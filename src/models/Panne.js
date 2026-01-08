const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Panne = sequelize.define('Panne', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    machineId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'machine_id',
    },
    interventionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
        field: 'intervention_id',
    },
    dateDeclaration: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'date_declaration',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    gravite: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Moyenne',
        // Possible values: Faible, Moyenne, Haute, Critique
    },
    statut: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Declaree',
        // Possible values: Declaree, En traitement, Resolue
    },
}, {
    tableName: 'panne',
    timestamps: false,
});

module.exports = Panne;
