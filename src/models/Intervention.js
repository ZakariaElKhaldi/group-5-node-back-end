const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Intervention = sequelize.define('Intervention', {
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
    technicienId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'technicien_id',
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'corrective',
        // Possible values: corrective, preventive
    },
    priorite: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Normale',
        // Possible values: Basse, Normale, Haute, Urgente
    },
    statut: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'En attente',
        // Possible values: En attente, En cours, Terminee, Annulee
    },
    dateDebut: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'date_debut',
    },
    dateFinPrevue: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'date_fin_prevue',
    },
    dateFinReelle: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'date_fin_reelle',
    },
    duree: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    resolution: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    coutMainOeuvre: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: 'cout_main_oeuvre',
    },
    coutPieces: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: 'cout_pieces',
    },
    coutTotal: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: 'cout_total',
    },
    tauxHoraireApplique: {
        type: DataTypes.DOUBLE,
        allowNull: true,
        field: 'taux_horaire_applique',
    },
    confirmationTechnicien: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'confirmation_technicien',
    },
    confirmationTechnicienAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'confirmation_technicien_at',
    },
    confirmationClient: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'confirmation_client',
    },
    confirmationClientAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'confirmation_client_at',
    },
    signatureClient: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'signature_client',
    },
    signerNom: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'signer_nom',
    },
}, {
    tableName: 'intervention',
    timestamps: false,
});

// Status transition rules
Intervention.VALID_STATUSES = ['En attente', 'En cours', 'Terminee', 'Annulee'];
Intervention.STATUS_TRANSITIONS = {
    'En attente': ['En cours', 'Annulee'],
    'En cours': ['Terminee', 'Annulee'],
    'Terminee': [],
    'Annulee': [],
};

// Instance method to check if status transition is allowed
Intervention.prototype.canTransitionTo = function (newStatus) {
    const allowed = Intervention.STATUS_TRANSITIONS[this.statut] || [];
    return allowed.includes(newStatus);
};

// Instance method to calculate costs
Intervention.prototype.calculateCosts = function () {
    // Calculate labor cost based on duration and hourly rate
    if (this.dateDebut && this.dateFinReelle && this.tauxHoraireApplique) {
        const start = new Date(this.dateDebut);
        const end = new Date(this.dateFinReelle);
        const hours = (end - start) / (1000 * 60 * 60);
        this.coutMainOeuvre = Math.round(hours * this.tauxHoraireApplique * 100) / 100;
    }

    // Calculate total cost
    this.coutTotal = (this.coutMainOeuvre || 0) + (this.coutPieces || 0);

    return this;
};

module.exports = Intervention;
