/**
 * Settings Tests (TDD)
 * Tests for /api/settings endpoints
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Settings } = require('../src/models');

describe('Settings API', () => {
    describe('GET /api/settings', () => {
        let adminToken;
        let regularToken;

        beforeAll(async () => {
            await global.ensureDbReady();

            const adminResult = await global.testUtils.createAdminUser();
            adminToken = adminResult.token;

            const regularResult = await global.testUtils.createTestUser();
            regularToken = regularResult.token;

            // Create some test settings
            await Settings.bulkCreate([
                { key: 'app_name', value: 'GMAO System', description: 'Application name' },
                { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode' },
                { key: 'default_language', value: 'fr', description: 'Default language' },
            ]);
        });

        afterAll(async () => {
            await Settings.destroy({ where: {} });
        });

        it('should return all settings for admin', async () => {
            const response = await request(app)
                .get('/api/settings')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(3);
        });

        it('should deny access for non-admin', async () => {
            const response = await request(app)
                .get('/api/settings')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(response.status).toBe(403);
        });

        it('should return 401 for unauthenticated request', async () => {
            const response = await request(app)
                .get('/api/settings');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/settings/:key', () => {
        let adminToken;

        beforeAll(async () => {
            await global.ensureDbReady();

            const adminResult = await global.testUtils.createAdminUser();
            adminToken = adminResult.token;

            await Settings.setValue('test_setting', 'test_value', 'Test setting');
        });

        it('should return specific setting by key', async () => {
            const response = await request(app)
                .get('/api/settings/test_setting')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.key).toBe('test_setting');
            expect(response.body.value).toBe('test_value');
        });

        it('should return 404 for non-existent setting', async () => {
            const response = await request(app)
                .get('/api/settings/nonexistent_key')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/settings/:key', () => {
        let adminToken;
        let regularToken;

        beforeAll(async () => {
            await global.ensureDbReady();

            const adminResult = await global.testUtils.createAdminUser();
            adminToken = adminResult.token;

            const regularResult = await global.testUtils.createTestUser();
            regularToken = regularResult.token;

            await Settings.setValue('editable_setting', 'original_value', 'Editable setting');
        });

        it('should allow admin to update setting', async () => {
            const response = await request(app)
                .put('/api/settings/editable_setting')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ value: 'updated_value' });

            expect(response.status).toBe(200);
            expect(response.body.value).toBe('updated_value');

            // Verify persistence
            const setting = await Settings.findOne({ where: { key: 'editable_setting' } });
            expect(setting.value).toBe('updated_value');
        });

        it('should deny update for non-admin', async () => {
            const response = await request(app)
                .put('/api/settings/editable_setting')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ value: 'hacked_value' });

            expect(response.status).toBe(403);
        });

        it('should create setting if not exists (upsert)', async () => {
            const response = await request(app)
                .put('/api/settings/new_setting')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    value: 'new_value',
                    description: 'Newly created setting',
                });

            expect(response.status).toBe(200);
            expect(response.body.key).toBe('new_setting');
            expect(response.body.value).toBe('new_value');
        });
    });

    describe('GET /api/settings/company', () => {
        let adminToken;
        let regularToken;

        beforeAll(async () => {
            await global.ensureDbReady();

            const adminResult = await global.testUtils.createAdminUser();
            adminToken = adminResult.token;

            const regularResult = await global.testUtils.createTestUser();
            regularToken = regularResult.token;
        });

        it('should return empty company data when no setting exists', async () => {
            // First clear any existing company setting
            await Settings.destroy({ where: { key: 'company' } });

            const response = await request(app)
                .get('/api/settings/company')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('name', '');
            expect(response.body).toHaveProperty('email', '');
            expect(response.body).toHaveProperty('phone', '');
        });

        it('should deny access for non-admin', async () => {
            const response = await request(app)
                .get('/api/settings/company')
                .set('Authorization', `Bearer ${regularToken}`);

            expect(response.status).toBe(403);
        });
    });

    describe('PUT /api/settings/company', () => {
        let adminToken;
        let regularToken;

        beforeAll(async () => {
            await global.ensureDbReady();

            const adminResult = await global.testUtils.createAdminUser();
            adminToken = adminResult.token;

            const regularResult = await global.testUtils.createTestUser();
            regularToken = regularResult.token;
        });

        it('should save company settings for admin', async () => {
            const companyData = {
                name: 'Test Company SARL',
                email: 'contact@test.ma',
                phone: '+212522123456',
                address: '123 Test Street',
                website: 'https://test.ma',
                ice: '001234567890123',
                rc: 'RC 123456',
                patente: '12345678',
                if: '12345678',
            };

            const response = await request(app)
                .put('/api/settings/company')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(companyData);

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Test Company SARL');
            expect(response.body.email).toBe('contact@test.ma');
        });

        it('should retrieve saved company settings', async () => {
            const response = await request(app)
                .get('/api/settings/company')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Test Company SARL');
            expect(response.body.ice).toBe('001234567890123');
        });

        it('should deny update for non-admin', async () => {
            const response = await request(app)
                .put('/api/settings/company')
                .set('Authorization', `Bearer ${regularToken}`)
                .send({ name: 'Hacked Company' });

            expect(response.status).toBe(403);
        });
    });
});
