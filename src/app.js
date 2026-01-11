require('dotenv').config();

const express = require('express');
const cors = require('cors');
const corsConfig = require('./config/cors');
const { sequelize } = require('./models');
const setupRoutes = require('./routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' })); // Support large payloads (signatures)
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });
}

// Setup routes
setupRoutes(app);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Database connection and server start
const start = async () => {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Sync database schema (alter: true adds new columns without dropping data)
        // Wrapped in try-catch because PostgreSQL may fail on some constraint changes
        try {
            await sequelize.sync({ alter: true });
            console.log('✅ Database schema synchronized');
        } catch (syncError) {
            console.log('⚠️ Full schema sync skipped:', syncError.message);

            // Manual migration: Add images column to work_order if missing
            try {
                await sequelize.query(`
                    ALTER TABLE work_order 
                    ADD COLUMN IF NOT EXISTS images JSON DEFAULT '[]';
                `);
                console.log('✅ WorkOrder images column ensured');
            } catch (migrationError) {
                // Column might already exist or other non-fatal error
                console.log('ℹ️ Images column check:', migrationError.message);
            }
        }

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📚 API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Unable to connect to database:', error.message);
        process.exit(1);
    }
};

start();
