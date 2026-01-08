const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fournisseur = sequelize.define('Fournisseur', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nom: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    telephone: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    adresse: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    delaiLivraison: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'delai_livraison',
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'fournisseur',
    timestamps: false,
});

module.exports = Fournisseur;
