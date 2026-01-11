/**
 * WorkOrder Tests (TDD)
 * Tests for unified WorkOrder model that replaces Panne + Intervention
 */

const request = require('supertest');
const app = require('../src/app.module');
const { WorkOrder, Machine, Client, Technicien } = require('../src/models');

describe('WorkOrder API', () => {
    let adminToken;
    let techToken;
    let testMachine;
    let testTechnicien;
    let testClient;

    beforeAll(async () => {
        await global.ensureDbReady();

        // Create admin user
        const adminResult = await global.testUtils.createAdminUser();
        adminToken = adminResult.token;

        // Create technician user
        const techResult = await global.testUtils.createTechnicianUser();
        techToken = techResult.token;
        testTechnicien = techResult.technicien;

        // Create test client
        testClient = await Client.create({
            nom: 'Test Client',
            email: 'client@test.com',
            telephone: '123456789',
        });

        // Create test machine
        testMachine = await Machine.create({
            modele: 'Test Machine',
            reference: `TM-${Date.now()}`,
            marque: 'Test Brand',
            type: 'Industrial',
            dateAcquisition: '2024-01-01',
            clientId: testClient.id,
            statut: 'En service',
        });
    });

    afterAll(async () => {
        await WorkOrder.destroy({ where: {} });
        await Machine.destroy({ where: {} });
        await Client.destroy({ where: {} });
    });

    describe('POST /api/workorders', () => {
        it('should create a corrective work order (from breakdown)', async () => {
            const response = await request(app)
                .post('/api/workorders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    machineId: testMachine.id,
                    type: 'corrective',
                    origin: 'breakdown',
                    priority: 'high',
                    severity: 'critical',
                    description: 'Machine not starting',
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.type).toBe('corrective');
            expect(response.body.origin).toBe('breakdown');
            expect(response.body.status).toBe('reported');
        });

        it('should create a preventive work order (scheduled)', async () => {
            const response = await request(app)
                .post('/api/workorders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    machineId: testMachine.id,
                    type: 'preventive',
                    origin: 'scheduled',
                    priority: 'low',
                    description: 'Monthly maintenance check',
                    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                });

            expect(response.status).toBe(201);
            expect(response.body.type).toBe('preventive');
            expect(response.body.origin).toBe('scheduled');
        });

        it('should require machine ID', async () => {
            const response = await request(app)
                .post('/api/workorders')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'corrective',
                    description: 'Missing machine ID',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/workorders', () => {
        beforeAll(async () => {
            // Create some test work orders
            await WorkOrder.bulkCreate([
                {
                    machineId: testMachine.id,
                    type: 'corrective',
                    origin: 'breakdown',
                    priority: 'high',
                    status: 'reported',
                    description: 'Test WO 1',
                },
                {
                    machineId: testMachine.id,
                    type: 'preventive',
                    origin: 'scheduled',
                    priority: 'low',
                    status: 'in_progress',
                    description: 'Test WO 2',
                },
            ]);
        });

        it('should return list of work orders', async () => {
            const response = await request(app)
                .get('/api/workorders')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.items.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter by status', async () => {
            const response = await request(app)
                .get('/api/workorders?status=reported')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.every(wo => wo.status === 'reported')).toBe(true);
        });

        it('should filter by type', async () => {
            const response = await request(app)
                .get('/api/workorders?type=corrective')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.every(wo => wo.type === 'corrective')).toBe(true);
        });

        it('should filter by machine', async () => {
            const response = await request(app)
                .get(`/api/workorders?machineId=${testMachine.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.every(wo => wo.machineId === testMachine.id)).toBe(true);
        });
    });

    describe('PUT /api/workorders/:id/assign', () => {
        let workOrderId;

        beforeAll(async () => {
            const wo = await WorkOrder.create({
                machineId: testMachine.id,
                type: 'corrective',
                origin: 'breakdown',
                priority: 'high',
                status: 'reported',
                description: 'To be assigned',
            });
            workOrderId = wo.id;
        });

        it('should assign technician to work order', async () => {
            const response = await request(app)
                .put(`/api/workorders/${workOrderId}/assign`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    technicienId: testTechnicien.id,
                });

            expect(response.status).toBe(200);
            expect(response.body.technicienId).toBe(testTechnicien.id);
            expect(response.body.status).toBe('assigned');
        });
    });

    describe('PUT /api/workorders/:id/status', () => {
        let workOrderId;

        beforeAll(async () => {
            const wo = await WorkOrder.create({
                machineId: testMachine.id,
                technicienId: testTechnicien.id,
                type: 'corrective',
                origin: 'breakdown',
                priority: 'high',
                status: 'assigned',
                description: 'For status test',
            });
            workOrderId = wo.id;
        });

        it('should update status to in_progress', async () => {
            const response = await request(app)
                .put(`/api/workorders/${workOrderId}/status`)
                .set('Authorization', `Bearer ${techToken}`)
                .send({ status: 'in_progress' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('in_progress');
            expect(response.body.dateStarted).toBeDefined();
        });

        it('should update status to completed with resolution', async () => {
            const response = await request(app)
                .put(`/api/workorders/${workOrderId}/status`)
                .set('Authorization', `Bearer ${techToken}`)
                .send({
                    status: 'completed',
                    resolution: 'Replaced faulty component',
                    laborCost: 150.00,
                    partsCost: 75.50,
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('completed');
            expect(response.body.resolution).toBe('Replaced faulty component');
            expect(response.body.dateCompleted).toBeDefined();
        });

        it('should reject invalid status transition', async () => {
            const newWO = await WorkOrder.create({
                machineId: testMachine.id,
                type: 'corrective',
                origin: 'breakdown',
                priority: 'high',
                status: 'reported', // Cannot go directly to completed
                description: 'Invalid transition test',
            });

            const response = await request(app)
                .put(`/api/workorders/${newWO.id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'completed' });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/workorders/:id', () => {
        let workOrderId;

        beforeAll(async () => {
            const wo = await WorkOrder.create({
                machineId: testMachine.id,
                type: 'corrective',
                origin: 'breakdown',
                priority: 'high',
                status: 'reported',
                description: 'Detail test',
            });
            workOrderId = wo.id;
        });

        it('should return work order details with machine info', async () => {
            const response = await request(app)
                .get(`/api/workorders/${workOrderId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(workOrderId);
            expect(response.body.machine).toBeDefined();
            expect(response.body.machine.modele).toBe('Test Machine');
        });

        it('should return 404 for non-existent work order', async () => {
            const response = await request(app)
                .get('/api/workorders/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });
});
