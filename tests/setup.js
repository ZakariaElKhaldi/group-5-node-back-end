/**
 * Jest Test Setup
 * Configures SQLite in-memory database for isolated testing
 */

const { sequelize } = require('../src/models');

// Increase timeout for database operations
jest.setTimeout(10000);

// Database ready promise - ensure sync happens before any tests
let dbReady = null;

const ensureDbReady = async () => {
    if (!dbReady) {
        dbReady = sequelize.sync({ force: true });
    }
    return dbReady;
};

// Export for tests that need to wait
global.ensureDbReady = ensureDbReady;

// Before all tests: sync database and seed RBAC data
beforeAll(async () => {
    // Force sync creates tables fresh for each test run
    await ensureDbReady();

    // Seed Role and Permission data
    const { Role, Permission } = require('../src/models');
    await Permission.seed();
    await Role.seed();
});

// After all tests: close database connection
afterAll(async () => {
    await sequelize.close();
});

// Global test utilities
global.testUtils = {
    /**
     * Create a test user and return JWT token
     */
    async createTestUser(userData = {}) {
        // Ensure database tables exist
        await ensureDbReady();

        const { User } = require('../src/models');
        const jwt = require('jsonwebtoken');
        const jwtConfig = require('../src/config/jwt');

        // Generate truly unique suffix
        const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

        const defaultUser = {
            email: `test-${uniqueSuffix}@example.com`,
            password: 'password123',
            nom: 'Test',
            prenom: 'User',
            roles: ['ROLE_USER'],
        };

        // Merge userData but ensure email is unique if provided
        const mergedData = { ...defaultUser };
        if (userData.email) {
            // Make the provided email unique by adding suffix before @
            mergedData.email = userData.email.replace('@', `-${uniqueSuffix}@`);
        }
        // Merge other fields (except email which we handled)
        const { email, ...otherData } = userData;
        Object.assign(mergedData, otherData);

        let user;
        try {
            user = await User.create(mergedData);
        } catch (error) {
            console.error('Failed to create test user:', error.message);
            console.error('Data:', JSON.stringify(mergedData, null, 2));
            throw error;
        }

        const token = jwt.sign(
            {
                username: user.email,
                roles: user.getRoles(),
            },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );

        return { user, token };
    },

    /**
     * Create admin user with token
     */
    async createAdminUser() {
        return this.createTestUser({
            email: `admin-${Date.now()}@example.com`,
            roles: ['ROLE_ADMIN'],
        });
    },

    /**
     * Create technician user with token
     */
    async createTechnicianUser() {
        const { Technicien } = require('../src/models');
        const { user, token } = await this.createTestUser({
            email: `tech-${Date.now()}@example.com`,
            roles: ['ROLE_TECHNICIEN'],
        });

        const technicien = await Technicien.create({
            userId: user.id,
            specialite: 'Test Speciality',
            tauxHoraire: 50.00,
            statut: 'Disponible',
        });

        return { user, technicien, token };
    },
};
