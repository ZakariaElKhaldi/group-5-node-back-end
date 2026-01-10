const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Settings Model
 * Key-value store for application settings
 */
const Settings = sequelize.define('Settings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        field: 'setting_key', // 'key' is reserved in some databases
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'setting_value',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
    },
}, {
    tableName: 'settings',
    timestamps: false,
});

/**
 * Get a setting value by key
 * @param {string} key - Setting key
 * @param {*} defaultValue - Default value if not found
 */
Settings.getValue = async function (key, defaultValue = null) {
    const setting = await this.findOne({ where: { key } });
    return setting ? setting.value : defaultValue;
};

/**
 * Set a setting value
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @param {string} description - Optional description
 */
Settings.setValue = async function (key, value, description = null) {
    const [setting, created] = await this.findOrCreate({
        where: { key },
        defaults: { value, description },
    });

    if (!created) {
        setting.value = value;
        if (description) setting.description = description;
        setting.updatedAt = new Date();
        await setting.save();
    }

    return setting;
};

module.exports = Settings;
