/**
 * Express App Module (for testing)
 * Exports the Express app without starting the server
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const corsConfig = require('./config/cors');
const setupRoutes = require('./routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');

const app = express();

// Middleware
app.use(cors(corsConfig));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup routes
setupRoutes(app);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
