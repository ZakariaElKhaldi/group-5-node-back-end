const authRoutes = require('./auth.routes');
const meRoutes = require('./me.routes');
const clientRoutes = require('./client.routes');
const machineRoutes = require('./machine.routes');
const technicienRoutes = require('./technicien.routes');
const pieceRoutes = require('./piece.routes');
const fournisseurRoutes = require('./fournisseur.routes');
const dashboardRoutes = require('./dashboard.routes');
const notificationRoutes = require('./notification.routes');
const settingsRoutes = require('./settings.routes');
const workorderRoutes = require('./workorder.routes');
const roleRoutes = require('./role.routes');
const userRoutes = require('./user.routes');
const mouvementStockRoutes = require('./mouvementStock.routes');
const photoSessionRoutes = require('./photo-session.routes');

const setupRoutes = (app) => {
    // Auth routes (login)
    app.use('/api', authRoutes);

    // Me routes (current user)
    app.use('/api', meRoutes);

    // Resource routes
    app.use('/api/clients', clientRoutes);
    app.use('/api/machines', machineRoutes);
    app.use('/api/techniciens', technicienRoutes);
    app.use('/api/pieces', pieceRoutes);
    app.use('/api/fournisseurs', fournisseurRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/workorders', workorderRoutes);
    app.use('/api/mouvements-stock', mouvementStockRoutes);

    // Admin routes (RBAC)
    app.use('/api/roles', roleRoutes);
    app.use('/api/users', userRoutes);

    // Photo sessions (mobile integration)
    app.use('/api/photo-sessions', photoSessionRoutes);
};

module.exports = setupRoutes;

