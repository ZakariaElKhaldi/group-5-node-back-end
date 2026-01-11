const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

/**
 * PhotoSession Model
 * Temporary session for mobile photo uploads
 * Web creates session, generates QR → Mobile scans, uploads → Web polls for images
 */
const PhotoSession = sequelize.define('PhotoSession', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

    // Session identifier (used in QR code)
    sessionCode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        field: 'session_code',
    },

    // What entity type this session is for
    entityType: {
        type: DataTypes.ENUM('machine', 'workorder'),
        allowNull: false,
        field: 'entity_type',
    },

    // Optional: Pre-linked entity ID (if entity already exists)
    entityId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'entity_id',
    },

    // Context info to show on mobile
    context: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment: 'Context info like client name, machine model, etc.',
    },

    // Session status
    status: {
        type: DataTypes.ENUM('pending', 'capturing', 'completed', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
    },

    // Uploaded images from mobile
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of Cloudinary URLs from mobile uploads',
    },

    // Creator user
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by',
    },

    // Expiration (sessions are temporary)
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at',
    },
}, {
    tableName: 'photo_session',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

// Generate a short session code (6 alphanumeric characters)
PhotoSession.generateSessionCode = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};

module.exports = PhotoSession;
