const authRoutes = require('./auth.routes');
const meRoutes = require('./me.routes');
const clientRoutes = require('./client.routes');
const machineRoutes = require('./machine.routes');
const interventionRoutes = require('./intervention.routes');
const technicienRoutes = require('./technicien.routes');
const pieceRoutes = require('./piece.routes');
const panneRoutes = require('./panne.routes');
const fournisseurRoutes = require('./fournisseur.routes');
const dashboardRoutes = require('./dashboard.routes');
const pieceInterventionRoutes = require('./pieceIntervention.routes');
const notificationRoutes = require('./notification.routes');

const setupRoutes = (app) => {
    // Auth routes (login)
    app.use('/api', authRoutes);

    // Me routes (current user)
    app.use('/api', meRoutes);

    // Resource routes
    app.use('/api/clients', clientRoutes);
    app.use('/api/machines', machineRoutes);
    app.use('/api/interventions', interventionRoutes);
    app.use('/api/techniciens', technicienRoutes);
    app.use('/api/pieces', pieceRoutes);
    app.use('/api/pannes', panneRoutes);
    app.use('/api/fournisseurs', fournisseurRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/piece-interventions', pieceInterventionRoutes);
    app.use('/api/notifications', notificationRoutes);
};

module.exports = setupRoutes;
