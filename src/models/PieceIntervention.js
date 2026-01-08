const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PieceIntervention = sequelize.define('PieceIntervention', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    pieceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'piece_id',
    },
    interventionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'intervention_id',
    },
    quantite: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    prixUnitaireApplique: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        field: 'prix_unitaire_applique',
    },
    dateUtilisation: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'date_utilisation',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'piece_intervention',
    timestamps: false,
});

module.exports = PieceIntervention;
