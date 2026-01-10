/**
 * Client Routes Tests (TDD)
 * Comprehensive tests for /api/clients endpoints
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Client } = require('../src/models');

describe('Client API', () => {
    let adminToken;
    let techToken;
    let testClient;

    beforeAll(async () => {
        await global.ensureDbReady();

        const adminResult = await global.testUtils.createAdminUser();
        adminToken = adminResult.token;

        const techResult = await global.testUtils.createTechnicianUser();
        techToken = techResult.token;
    });

    afterAll(async () => {
        await Client.destroy({ where: {} });
    });

    describe('POST /api/clients', () => {
        it('should create a new client with valid data', async () => {
            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom: 'Test Company',
                    email: 'test@company.com',
                    telephone: '+212 600 000 000',
                    adresse: '123 Test Street',
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.nom).toBe('Test Company');
            testClient = response.body;
        });

        it('should require nom field', async () => {
            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'missing@nom.com',
                });

            // Accepts 400 (explicit validation) or 500 (Sequelize validation)
            expect([400, 500]).toContain(response.status);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/clients')
                .send({
                    nom: 'Unauthorized Client',
                });

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/clients', () => {
        beforeAll(async () => {
            // Create test clients
            await Client.bulkCreate([
                { nom: 'Client Alpha', email: 'alpha@test.com', telephone: '111' },
                { nom: 'Client Beta', email: 'beta@test.com', telephone: '222' },
                { nom: 'Client Gamma', email: 'gamma@test.com', telephone: '333' },
            ]);
        });

        it('should return paginated list of clients', async () => {
            const response = await request(app)
                .get('/api/clients')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.total).toBeGreaterThanOrEqual(3);
        });

        it('should support pagination parameters', async () => {
            const response = await request(app)
                .get('/api/clients?page=1&limit=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeLessThanOrEqual(2);
            expect(response.body.page).toBe(1);
            expect(response.body.limit).toBe(2);
        });

        it('should support search by name', async () => {
            const response = await request(app)
                .get('/api/clients?search=Alpha')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.some(c => c.nom.includes('Alpha'))).toBe(true);
        });
    });

    describe('GET /api/clients/:id', () => {
        let clientId;

        beforeAll(async () => {
            const client = await Client.create({
                nom: 'Specific Client',
                email: 'specific@test.com',
                telephone: '555',
            });
            clientId = client.id;
        });

        it('should return client by ID', async () => {
            const response = await request(app)
                .get(`/api/clients/${clientId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(clientId);
            expect(response.body.nom).toBe('Specific Client');
        });

        it('should return 404 for non-existent client', async () => {
            const response = await request(app)
                .get('/api/clients/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/clients/:id', () => {
        let clientId;

        beforeAll(async () => {
            const client = await Client.create({
                nom: 'Update Test Client',
                email: 'update@test.com',
                telephone: '666',
            });
            clientId = client.id;
        });

        it('should update client fields', async () => {
            const response = await request(app)
                .put(`/api/clients/${clientId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom: 'Updated Client Name',
                    telephone: '777',
                });

            expect(response.status).toBe(200);
            expect(response.body.nom).toBe('Updated Client Name');
            expect(response.body.telephone).toBe('777');
        });

        it('should return 404 for non-existent client', async () => {
            const response = await request(app)
                .put('/api/clients/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nom: 'New Name' });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/clients/:id', () => {
        let clientId;

        beforeAll(async () => {
            const client = await Client.create({
                nom: 'Delete Test Client',
                email: 'delete@test.com',
                telephone: '888',
            });
            clientId = client.id;
        });

        it('should delete client', async () => {
            const response = await request(app)
                .delete(`/api/clients/${clientId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(204);

            // Verify deletion
            const check = await Client.findByPk(clientId);
            expect(check).toBeNull();
        });

        it('should return 404 for non-existent client', async () => {
            const response = await request(app)
                .delete('/api/clients/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });
});
