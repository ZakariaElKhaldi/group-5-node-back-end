const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MouvementStock = sequelize.define('MouvementStock', {
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
    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        // Possible values: entree, sortie
    },
    quantite: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    quantiteAvant: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'quantite_avant',
    },
    quantiteApres: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'quantite_apres',
    },
    motif: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'mouvement_stock',
    timestamps: false,
});

module.exports = MouvementStock;
