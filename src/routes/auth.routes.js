const express = require('express');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { User, Technicien } = require('../models');

const router = express.Router();

/**
 * POST /api/login_check
 * Authenticate user and return JWT token
 * Matches PHP Symfony lexik/jwt-authentication-bundle behavior
 */
router.post('/login_check', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email: username } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Validate password
        const isValid = await user.validatePassword(password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token (matching PHP structure)
        const token = jwt.sign(
            {
                username: user.email,
                roles: user.getRoles(),
            },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
