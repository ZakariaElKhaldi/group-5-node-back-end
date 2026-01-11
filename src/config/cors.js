require('dotenv').config();

module.exports = {
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        process.env.CORS_ORIGIN
    ].filter(Boolean),
    methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Link'],
    maxAge: 3600,
    credentials: true,
};
