const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.NODE_ENV === 'test') {
    // Use SQLite in-memory for testing
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
        define: {
            timestamps: false,
            underscored: true,
        },
    });
} else {
    // Use PostgreSQL (default) or MySQL for development/production
    const dialect = process.env.DB_DIALECT || 'postgres';

    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || (dialect === 'postgres' ? 5432 : 3306),
            dialect: dialect,
            logging: process.env.NODE_ENV === 'development' ? console.log : false,
            define: {
                timestamps: false,
                underscored: true,
            },
            // PostgreSQL specific options
            ...(dialect === 'postgres' && {
                dialectOptions: {
                    ssl: process.env.DB_SSL === 'true' ? {
                        require: true,
                        rejectUnauthorized: false,
                    } : false,
                },
            }),
        }
    );
}

module.exports = sequelize;
