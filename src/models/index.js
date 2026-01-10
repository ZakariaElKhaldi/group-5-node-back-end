const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Client = require('./Client');
const Machine = require('./Machine');
const Technicien = require('./Technicien');
const Fournisseur = require('./Fournisseur');
const Piece = require('./Piece');
const Intervention = require('./Intervention');
const Panne = require('./Panne');
const MouvementStock = require('./MouvementStock');
const PieceIntervention = require('./PieceIntervention');
const InterventionLog = require('./InterventionLog');
const Notification = require('./Notification');
const NotificationRead = require('./NotificationRead');
const Settings = require('./Settings');
const WorkOrder = require('./WorkOrder');
const Role = require('./Role');
const Permission = require('./Permission');

// ==========================================
// Define Associations (matching PHP entities)
// ==========================================

// User <-> Technicien (OneToOne)
User.hasOne(Technicien, { foreignKey: 'userId', as: 'technicien' });
Technicien.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Client <-> Machine (OneToMany)
Client.hasMany(Machine, { foreignKey: 'clientId', as: 'machines' });
Machine.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

// Machine <-> Intervention (OneToMany)
Machine.hasMany(Intervention, { foreignKey: 'machineId', as: 'interventions' });
Intervention.belongsTo(Machine, { foreignKey: 'machineId', as: 'machine' });

// Machine <-> Panne (OneToMany)
Machine.hasMany(Panne, { foreignKey: 'machineId', as: 'pannes' });
Panne.belongsTo(Machine, { foreignKey: 'machineId', as: 'machine' });

// Technicien <-> Intervention (OneToMany)
Technicien.hasMany(Intervention, { foreignKey: 'technicienId', as: 'interventions' });
Intervention.belongsTo(Technicien, { foreignKey: 'technicienId', as: 'technicien' });

// Intervention <-> Panne (OneToOne)
Intervention.hasOne(Panne, { foreignKey: 'interventionId', as: 'panne' });
Panne.belongsTo(Intervention, { foreignKey: 'interventionId', as: 'intervention' });

// Fournisseur <-> Piece (OneToMany)
Fournisseur.hasMany(Piece, { foreignKey: 'fournisseurId', as: 'pieces' });
Piece.belongsTo(Fournisseur, { foreignKey: 'fournisseurId', as: 'fournisseur' });

// Piece <-> MouvementStock (OneToMany)
Piece.hasMany(MouvementStock, { foreignKey: 'pieceId', as: 'mouvementsStock' });
MouvementStock.belongsTo(Piece, { foreignKey: 'pieceId', as: 'piece' });

// Piece <-> PieceIntervention (OneToMany)
Piece.hasMany(PieceIntervention, { foreignKey: 'pieceId', as: 'pieceInterventions' });
PieceIntervention.belongsTo(Piece, { foreignKey: 'pieceId', as: 'piece' });

// Intervention <-> PieceIntervention (OneToMany)
Intervention.hasMany(PieceIntervention, { foreignKey: 'interventionId', as: 'pieceInterventions' });
PieceIntervention.belongsTo(Intervention, { foreignKey: 'interventionId', as: 'intervention' });

// Intervention <-> InterventionLog (OneToMany)
Intervention.hasMany(InterventionLog, { foreignKey: 'interventionId', as: 'logs' });
InterventionLog.belongsTo(Intervention, { foreignKey: 'interventionId', as: 'intervention' });

// User <-> InterventionLog (OneToMany)
User.hasMany(InterventionLog, { foreignKey: 'userId', as: 'logs' });
InterventionLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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
    Intervention,
    Panne,
    MouvementStock,
    PieceIntervention,
    InterventionLog,
    Notification,
    NotificationRead,
    Settings,
    WorkOrder,
    Role,
    Permission,
};
