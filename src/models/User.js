const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING(180),
        allowNull: false,
        unique: true,
    },
    roles: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    nom: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    prenom: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'role_id',
        comment: 'Foreign key to Role model for dynamic permissions',
    },
}, {
    tableName: 'user',
    timestamps: false,
});

// Instance method to check password
User.prototype.validatePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

// Instance method to get roles (always includes ROLE_USER)
User.prototype.getRoles = function () {
    const roles = this.roles || [];
    if (!roles.includes('ROLE_USER')) {
        roles.push('ROLE_USER');
    }
    return [...new Set(roles)];
};

// Hash password before save
User.beforeCreate(async (user) => {
    if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

module.exports = User;
