const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Piece = sequelize.define('Piece', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    reference: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
    },
    nom: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    prixUnitaire: {
        type: DataTypes.DOUBLE,
        allowNull: false,
        field: 'prix_unitaire',
    },
    quantiteStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'quantite_stock',
    },
    seuilAlerte: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        field: 'seuil_alerte',
    },
    emplacement: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    fournisseurId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'fournisseur_id',
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'piece',
    timestamps: false,
});

// Instance method to check low stock
Piece.prototype.isLowStock = function () {
    return this.quantiteStock <= this.seuilAlerte;
};

// Instance method to deduct stock
Piece.prototype.deduireStock = function (quantite) {
    if (quantite > this.quantiteStock) {
        throw new Error(
            `Stock insuffisant pour la pièce ${this.reference} (demandé: ${quantite}, disponible: ${this.quantiteStock})`
        );
    }
    this.quantiteStock -= quantite;
    return this;
};

// Instance method to add stock
Piece.prototype.ajouterStock = function (quantite) {
    this.quantiteStock += quantite;
    return this;
};

module.exports = Piece;
