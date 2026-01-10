/**
 * Notification Tests (TDD)
 * Tests for /api/notifications endpoints
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Notification, NotificationRead, User } = require('../src/models');

describe('Notification API', () => {
    describe('GET /api/notifications', () => {
        let adminUser, adminToken;
        let regularUser, regularToken;

        beforeAll(async () => {
            await global.ensureDbReady();

            // Create admin user
            const adminResult = await global.testUtils.createAdminUser();
            adminUser = adminResult.user;
            adminToken = adminResult.token;

            // Create regular user
            const regularResult = await global.testUtils.createTestUser();
            regularUser = regularResult.user;
            regularToken = regularResult.token;

            // Create some test notifications
            await Notification.bulkCreate([
                {
                    titre: 'Test Notification 1',
                    message: 'This is a test notification',
                    type: 'info',
                    targetRole: null, // For all users
                },
                {
                    titre: 'Admin Only Notification',
                    message: 'This is for admins only',
                    type: 'warning',
                    targetRole: 'ROLE_ADMIN',
                },
                {
                    titre: 'Test Notification 2',
                    message: 'Another test notification',
                    type: 'success',
                    targetRole: null,
                },
            ]);
        });

        afterAll(async () => {
            await Notification.destroy({ where: {} });
            await NotificationRead.destroy({ where: {} });
        });

        it('should return notifications for authenticated user', async () => {
            const response = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2); // At least the 2 non-admin notifications
        });

        it('should return 401 for unauthenticated request', async () => {
            const response = await request(app)
                .get('/api/notifications');

            expect(response.status).toBe(401);
        });

        it('should include admin-targeted notifications for admin users', async () => {
            const response = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            const adminNotification = response.body.find(n => n.titre === 'Admin Only Notification');
            expect(adminNotification).toBeDefined();
        });

        it('should exclude admin-targeted notifications for regular users', async () => {
            const response = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(response.status).toBe(200);

            const adminNotification = response.body.find(n => n.titre === 'Admin Only Notification');
            expect(adminNotification).toBeUndefined();
        });
    });

    describe('POST /api/notifications/:id/read', () => {
        let userToken;
        let testNotification;

        beforeAll(async () => {
            await global.ensureDbReady();

            const result = await global.testUtils.createTestUser();
            userToken = result.token;

            testNotification = await Notification.create({
                titre: 'Read Test Notification',
                message: 'Test message',
                type: 'info',
            });
        });

        afterAll(async () => {
            await Notification.destroy({ where: { titre: 'Read Test Notification' } });
            await NotificationRead.destroy({ where: {} });
        });

        it('should mark notification as read', async () => {
            const response = await request(app)
                .post(`/api/notifications/${testNotification.id}/read`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should not duplicate read records', async () => {
            // Mark as read twice
            await request(app)
                .post(`/api/notifications/${testNotification.id}/read`)
                .set('Authorization', `Bearer ${userToken}`);

            await request(app)
                .post(`/api/notifications/${testNotification.id}/read`)
                .set('Authorization', `Bearer ${userToken}`);

            // Check there's only one read record
            const readCount = await NotificationRead.count({
                where: { notificationId: testNotification.id },
            });

            expect(readCount).toBe(1);
        });

        it('should return 404 for non-existent notification', async () => {
            const response = await request(app)
                .post('/api/notifications/99999/read')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /api/notifications (Create - Admin only)', () => {
        let adminToken;
        let regularToken;

        beforeAll(async () => {
            await global.ensureDbReady();

            const adminResult = await global.testUtils.createAdminUser();
            adminToken = adminResult.token;

            const regularResult = await global.testUtils.createTestUser();
            regularToken = regularResult.token;
        });

        it('should allow admin to create notification', async () => {
            const response = await request(app)
                .post('/api/notifications')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    titre: 'New Notification',
                    message: 'Created by admin',
                    type: 'info',
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.titre).toBe('New Notification');
        });

        it('should reject notification creation for non-admin', async () => {
            const response = await request(app)
                .post('/api/notifications')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({
                    titre: 'New Notification',
                    message: 'Created by regular user',
                    type: 'info',
                });

            expect(response.status).toBe(403);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/notifications')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    message: 'Missing titre',
                });

            expect(response.status).toBe(400);
        });
    });
});
