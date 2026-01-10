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
    // Image storage (Cloudinary URLs)
    images: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of image URLs from Cloudinary',
    },
    primaryImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'primary_image',
        comment: 'Main display image URL',
    },
    // QR Code
    qrCodeData: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'qr_code_data',
        comment: 'Unique identifier for QR code lookup',
    },
}, {
    tableName: 'machine',
    timestamps: false,
});

module.exports = Machine;
