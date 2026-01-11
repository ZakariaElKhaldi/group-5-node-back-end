const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * WorkOrder Model
 * Unified model replacing Panne + Intervention
 * Handles all maintenance work: corrective, preventive, and inspections
 */
const WorkOrder = sequelize.define('WorkOrder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },

    // Foreign Keys
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

    // Work Order Classification
    type: {
        type: DataTypes.ENUM('corrective', 'preventive', 'inspection'),
        allowNull: false,
        defaultValue: 'corrective',
        comment: 'Type of work order',
    },
    origin: {
        type: DataTypes.ENUM('breakdown', 'scheduled', 'request'),
        allowNull: false,
        defaultValue: 'breakdown',
        comment: 'How the work order was created',
    },

    // Priority & Severity
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
    },
    severity: {
        type: DataTypes.ENUM('minor', 'moderate', 'major', 'critical'),
        allowNull: true,
        comment: 'Severity of the issue (for corrective work)',
    },

    // Status Flow
    status: {
        type: DataTypes.ENUM(
            'reported',      // Initial state
            'assigned',      // Technician assigned
            'in_progress',   // Work started
            'pending_parts', // Waiting for parts
            'completed',     // Work finished
            'cancelled'      // Cancelled
        ),
        allowNull: false,
        defaultValue: 'reported',
    },

    // Description & Resolution
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    resolution: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'How the issue was resolved',
    },

    // Image storage (Cloudinary URLs)
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of image URLs from Cloudinary',
    },

    // Dates
    dateReported: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'date_reported',
    },
    scheduledDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'scheduled_date',
        comment: 'For preventive/scheduled work orders',
    },
    dateStarted: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'date_started',
    },
    dateCompleted: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'date_completed',
    },

    // Time & Cost
    estimatedDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'estimated_duration',
        comment: 'Estimated time in minutes',
    },
    actualDuration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'actual_duration',
        comment: 'Actual time taken in minutes',
    },
    laborCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'labor_cost',
    },
    partsCost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'parts_cost',
    },

    // Signatures (for mobile confirmation)
    signatureClient: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'signature_client',
        comment: 'Base64 encoded signature image',
    },
    signatureClientAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'signature_client_at',
    },
    confirmedByTech: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'confirmed_by_tech',
    },
    confirmedByTechAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'confirmed_by_tech_at',
    },

    // Legacy reference (for migration)
    legacyPanneId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'legacy_panne_id',
        comment: 'Reference to old Panne record (for migration)',
    },
    legacyInterventionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'legacy_intervention_id',
        comment: 'Reference to old Intervention record (for migration)',
    },
}, {
    tableName: 'work_order',
    timestamps: false,
});

/**
 * Calculate total cost
 */
WorkOrder.prototype.getTotalCost = function () {
    const labor = parseFloat(this.laborCost) || 0;
    const parts = parseFloat(this.partsCost) || 0;
    return labor + parts;
};

/**
 * Calculate actual duration from dates
 */
WorkOrder.prototype.calculateDuration = function () {
    if (this.dateStarted && this.dateCompleted) {
        const diff = new Date(this.dateCompleted) - new Date(this.dateStarted);
        return Math.round(diff / (1000 * 60)); // Convert to minutes
    }
    return null;
};

/**
 * Valid status transitions
 */
WorkOrder.STATUS_TRANSITIONS = {
    'reported': ['assigned', 'cancelled'],
    'assigned': ['in_progress', 'cancelled'],
    'in_progress': ['pending_parts', 'completed', 'cancelled'],
    'pending_parts': ['in_progress', 'cancelled'],
    'completed': [], // Final state
    'cancelled': [], // Final state
};

/**
 * Check if status transition is valid
 */
WorkOrder.canTransitionTo = function (currentStatus, newStatus) {
    const allowedTransitions = this.STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
};

module.exports = WorkOrder;
