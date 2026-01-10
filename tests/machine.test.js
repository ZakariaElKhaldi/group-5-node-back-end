/**
 * Machine Routes Tests (TDD)
 * Comprehensive tests for /api/machines endpoints
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Machine, Client } = require('../src/models');

describe('Machine API', () => {
    let adminToken;
    let techToken;
    let testClient;

    beforeAll(async () => {
        await global.ensureDbReady();

        const adminResult = await global.testUtils.createAdminUser();
        adminToken = adminResult.token;

        const techResult = await global.testUtils.createTechnicianUser();
        techToken = techResult.token;

        testClient = await Client.create({
            nom: 'Machine Test Client',
            email: 'machines@test.com',
            telephone: '123456',
        });
    });

    afterAll(async () => {
        await Machine.destroy({ where: {} });
        await Client.destroy({ where: {} });
    });

    describe('POST /api/machines', () => {
        it('should create a new machine with valid data', async () => {
            const response = await request(app)
                .post('/api/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reference: `REF-${Date.now()}`,
                    modele: 'Industrial Printer X200',
                    marque: 'HP',
                    type: 'Printer',
                    dateAcquisition: '2024-01-15',
                    statut: 'En service',
                    clientId: testClient.id,
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.modele).toBe('Industrial Printer X200');
            expect(response.body.client).toBeDefined();
        });

        it('should require reference field', async () => {
            const response = await request(app)
                .post('/api/machines')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    modele: 'Missing Ref',
                    marque: 'Test',
                    type: 'Test',
                    dateAcquisition: '2024-01-01',
                });

            expect(response.status).toBe(500); // Sequelize validation error
        });
    });

    describe('GET /api/machines', () => {
        beforeAll(async () => {
            await Machine.bulkCreate([
                {
                    reference: `M-A-${Date.now()}`,
                    modele: 'Machine Alpha',
                    marque: 'Brand A',
                    type: 'Type A',
                    dateAcquisition: '2024-01-01',
                    statut: 'En service',
                    clientId: testClient.id,
                },
                {
                    reference: `M-B-${Date.now()}`,
                    modele: 'Machine Beta',
                    marque: 'Brand B',
                    type: 'Type B',
                    dateAcquisition: '2024-02-01',
                    statut: 'En maintenance',
                    clientId: testClient.id,
                },
                {
                    reference: `M-C-${Date.now()}`,
                    modele: 'Machine Gamma',
                    marque: 'Brand C',
                    type: 'Type C',
                    dateAcquisition: '2024-03-01',
                    statut: 'Hors service',
                    clientId: testClient.id,
                },
            ]);
        });

        it('should return paginated list of machines', async () => {
            const response = await request(app)
                .get('/api/machines')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.total).toBeGreaterThanOrEqual(3);
        });

        it('should filter by statut', async () => {
            const response = await request(app)
                .get('/api/machines?statut=En service')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.every(m => m.statut === 'En service')).toBe(true);
        });

        it('should search by reference or modele', async () => {
            const response = await request(app)
                .get('/api/machines?search=Alpha')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.some(m => m.modele.includes('Alpha'))).toBe(true);
        });
    });

    describe('GET /api/machines/:id', () => {
        let machineId;

        beforeAll(async () => {
            const machine = await Machine.create({
                reference: `SPECIFIC-${Date.now()}`,
                modele: 'Specific Machine',
                marque: 'Test Brand',
                type: 'Test Type',
                dateAcquisition: '2024-01-01',
                statut: 'En service',
                clientId: testClient.id,
            });
            machineId = machine.id;
        });

        it('should return machine by ID with client info', async () => {
            const response = await request(app)
                .get(`/api/machines/${machineId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(machineId);
            expect(response.body.client).toBeDefined();
        });

        it('should return 404 for non-existent machine', async () => {
            const response = await request(app)
                .get('/api/machines/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PUT /api/machines/:id', () => {
        let machineId;

        beforeAll(async () => {
            const machine = await Machine.create({
                reference: `UPDATE-${Date.now()}`,
                modele: 'Update Test Machine',
                marque: 'Old Brand',
                type: 'Old Type',
                dateAcquisition: '2024-01-01',
                statut: 'En service',
                clientId: testClient.id,
            });
            machineId = machine.id;
        });

        it('should update machine fields', async () => {
            const response = await request(app)
                .put(`/api/machines/${machineId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    modele: 'Updated Machine Model',
                    statut: 'En maintenance',
                });

            expect(response.status).toBe(200);
            expect(response.body.modele).toBe('Updated Machine Model');
            expect(response.body.statut).toBe('En maintenance');
        });

        it('should return 404 for non-existent machine', async () => {
            const response = await request(app)
                .put('/api/machines/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ modele: 'New Model' });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/machines/:id', () => {
        let machineId;

        beforeAll(async () => {
            const machine = await Machine.create({
                reference: `DELETE-${Date.now()}`,
                modele: 'Delete Test Machine',
                marque: 'Delete Brand',
                type: 'Delete Type',
                dateAcquisition: '2024-01-01',
                statut: 'Hors service',
                clientId: testClient.id,
            });
            machineId = machine.id;
        });

        it('should delete machine', async () => {
            const response = await request(app)
                .delete(`/api/machines/${machineId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(204);

            const check = await Machine.findByPk(machineId);
            expect(check).toBeNull();
        });

        it('should return 404 for non-existent machine', async () => {
            const response = await request(app)
                .delete('/api/machines/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/machines/:id/qrcode', () => {
        let machineId;

        beforeAll(async () => {
            const machine = await Machine.create({
                reference: `QR-${Date.now()}`,
                modele: 'QR Test Machine',
                marque: 'QR Brand',
                type: 'QR Type',
                dateAcquisition: '2024-01-01',
                statut: 'En service',
                clientId: testClient.id,
            });
            machineId = machine.id;
        });

        it('should generate QR code as PNG', async () => {
            const response = await request(app)
                .get(`/api/machines/${machineId}/qrcode`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('image/png');
        });

        it('should return QR code as data URL', async () => {
            const response = await request(app)
                .get(`/api/machines/${machineId}/qrcode?dataUrl=true`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.qrCode).toBeDefined();
            expect(response.body.qrCode).toContain('data:image/png;base64');
        });

        it('should return 404 for non-existent machine', async () => {
            const response = await request(app)
                .get('/api/machines/99999/qrcode')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });
});
