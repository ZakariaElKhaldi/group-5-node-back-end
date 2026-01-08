/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Sequelize validation errors
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            errors: err.errors.map(e => e.message),
        });
    }

    // Sequelize unique constraint errors
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            error: 'Duplicate entry',
            errors: err.errors.map(e => e.message),
        });
    }

    // Sequelize foreign key errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            error: 'Foreign key constraint error',
        });
    }

    // Default server error
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
};

/**
 * Not found handler for undefined routes
 */
const notFound = (req, res) => {
    res.status(404).json({ error: 'Route not found' });
};

module.exports = { errorHandler, notFound };
