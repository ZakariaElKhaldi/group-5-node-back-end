const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Client = require('./Client');
const Machine = require('./Machine');
const Technicien = require('./Technicien');
const Fournisseur = require('./Fournisseur');
const Piece = require('./Piece');
const MouvementStock = require('./MouvementStock');
const Notification = require('./Notification');
const NotificationRead = require('./NotificationRead');
const Settings = require('./Settings');
const WorkOrder = require('./WorkOrder');
const Role = require('./Role');
const Permission = require('./Permission');
const PhotoSession = require('./PhotoSession');

// ==========================================
// Define Associations (matching entities)
// ==========================================

// User <-> Technicien (OneToOne)
User.hasOne(Technicien, { foreignKey: 'userId', as: 'technicien' });
Technicien.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Client <-> Machine (OneToMany)
Client.hasMany(Machine, { foreignKey: 'clientId', as: 'machines' });
Machine.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

// Fournisseur <-> Piece (OneToMany)
Fournisseur.hasMany(Piece, { foreignKey: 'fournisseurId', as: 'pieces' });
Piece.belongsTo(Fournisseur, { foreignKey: 'fournisseurId', as: 'fournisseur' });

// Piece <-> MouvementStock (OneToMany)
Piece.hasMany(MouvementStock, { foreignKey: 'pieceId', as: 'mouvementsStock' });
MouvementStock.belongsTo(Piece, { foreignKey: 'pieceId', as: 'piece' });

// Notification <-> NotificationRead (OneToMany)
Notification.hasMany(NotificationRead, { foreignKey: 'notificationId', as: 'reads' });
NotificationRead.belongsTo(Notification, { foreignKey: 'notificationId', as: 'notification' });

// User <-> NotificationRead (OneToMany)
User.hasMany(NotificationRead, { foreignKey: 'userId', as: 'notificationReads' });
NotificationRead.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Machine <-> WorkOrder (OneToMany)
Machine.hasMany(WorkOrder, { foreignKey: 'machineId', as: 'workOrders' });
WorkOrder.belongsTo(Machine, { foreignKey: 'machineId', as: 'machine' });

// Technicien <-> WorkOrder (OneToMany)
Technicien.hasMany(WorkOrder, { foreignKey: 'technicienId', as: 'workOrders' });
WorkOrder.belongsTo(Technicien, { foreignKey: 'technicienId', as: 'technicien' });

// User <-> Role (ManyToOne)
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

module.exports = {
    sequelize,
    User,
    Client,
    Machine,
    Technicien,
    Fournisseur,
    Piece,
    MouvementStock,
    Notification,
    NotificationRead,
    Settings,
    WorkOrder,
    Role,
    Permission,
    PhotoSession,
};
