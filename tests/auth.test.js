/**
 * Authentication Tests (TDD)
 * Tests for /api/login_check endpoint
 */

const request = require('supertest');
const app = require('../src/app.module');
const { User } = require('../src/models');

describe('Authentication API', () => {
    describe('POST /api/login_check', () => {
        let testUser;

        beforeAll(async () => {
            // Ensure database is ready (tables created)
            await global.ensureDbReady();
            // Create a test user with known credentials
            testUser = await User.create({
                email: 'auth-test@example.com',
                password: 'testpassword123',
                nom: 'Auth',
                prenom: 'Test',
                roles: ['ROLE_USER'],
            });
        });

        afterAll(async () => {
            // Cleanup
            await User.destroy({ where: { email: 'auth-test@example.com' } });
        });

        it('should return JWT token with valid credentials', async () => {
            const response = await request(app)
                .post('/api/login_check')
                .send({
                    username: 'auth-test@example.com',
                    password: 'testpassword123',
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(typeof response.body.token).toBe('string');
            expect(response.body.token.length).toBeGreaterThan(0);
        });

        it('should return 401 with invalid password', async () => {
            const response = await request(app)
                .post('/api/login_check')
                .send({
                    username: 'auth-test@example.com',
                    password: 'wrongpassword',
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        it('should return 401 with non-existent user', async () => {
            const response = await request(app)
                .post('/api/login_check')
                .send({
                    username: 'nonexistent@example.com',
                    password: 'anypassword',
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 when username is missing', async () => {
            const response = await request(app)
                .post('/api/login_check')
                .send({
                    password: 'testpassword123',
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 when password is missing', async () => {
            const response = await request(app)
                .post('/api/login_check')
                .send({
                    username: 'auth-test@example.com',
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Token Validation', () => {
        it('should allow access to protected routes with valid token', async () => {
            const { token } = await global.testUtils.createTestUser();

            const response = await request(app)
                .get('/api/me')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
        });

        it('should deny access to protected routes without token', async () => {
            const response = await request(app)
                .get('/api/me');

            expect(response.status).toBe(401);
        });

        it('should deny access with invalid token', async () => {
            const response = await request(app)
                .get('/api/me')
                .set('Authorization', 'Bearer invalid-token-here');

            expect(response.status).toBe(401);
        });
    });
});
