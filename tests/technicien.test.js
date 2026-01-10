/**
 * Technicien Routes Tests (TDD)
 * Comprehensive tests for /api/techniciens endpoints
 * 
 * BEFORE: 16% coverage (16.04 lines)
 * TARGET: 80%+ coverage
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Technicien, User } = require('../src/models');

describe('Technicien API', () => {
    let adminToken;

    beforeAll(async () => {
        await global.ensureDbReady();

        const adminResult = await global.testUtils.createAdminUser();
        adminToken = adminResult.token;
    });

    afterAll(async () => {
        // Clean up techniciens created in tests (but not the test utilities one)
        await Technicien.destroy({
            where: {},
            force: true,
        });
    });

    // ========================================
    // CREATE Tests
    // ========================================
    describe('POST /api/techniciens', () => {
        it('should create a new technician with user account', async () => {
            const uniqueEmail = `tech-new-${Date.now()}@test.com`;

            const response = await request(app)
                .post('/api/techniciens')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: uniqueEmail,
                    nom: 'Dupont',
                    prenom: 'Jean',
                    password: 'securePassword123',
                    specialite: 'Électromécanique',
                    tauxHoraire: 65.00,
                    statut: 'Disponible',
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.specialite).toBe('Électromécanique');
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(uniqueEmail);
        });

        it('should use default values if not provided', async () => {
            const uniqueEmail = `tech-default-${Date.now()}@test.com`;

            const response = await request(app)
                .post('/api/techniciens')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: uniqueEmail,
                    nom: 'Martin',
                    prenom: 'Pierre',
                });

            expect(response.status).toBe(201);
            expect(response.body.statut).toBe('Disponible');
            expect(parseFloat(response.body.tauxHoraire)).toBe(50.0);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/techniciens')
                .send({ nom: 'Unauthorized', prenom: 'Test' });

            expect(response.status).toBe(401);
        });
    });

    // ========================================
    // READ Tests
    // ========================================
    describe('GET /api/techniciens', () => {
        beforeAll(async () => {
            // Create test technicians
            for (let i = 1; i <= 3; i++) {
                const user = await User.create({
                    email: `tech-list-${Date.now()}-${i}@test.com`,
                    password: 'password123',
                    nom: `Tech${i}`,
                    prenom: `Prenom${i}`,
                    roles: ['ROLE_TECHNICIEN'],
                });
                await Technicien.create({
                    userId: user.id,
                    specialite: `Specialite ${i}`,
                    tauxHoraire: 50 + (i * 5),
                    statut: i === 1 ? 'Disponible' : 'En intervention',
                });
            }
        });

        it('should return paginated list of technicians', async () => {
            const response = await request(app)
                .get('/api/techniciens')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.total).toBeGreaterThanOrEqual(3);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/techniciens?page=1&limit=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeLessThanOrEqual(2);
            expect(response.body.page).toBe(1);
            expect(response.body.limit).toBe(2);
        });

        it('should filter by statut', async () => {
            const response = await request(app)
                .get('/api/techniciens?statut=Disponible')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.every(t => t.statut === 'Disponible')).toBe(true);
        });

        it('should include user info', async () => {
            const response = await request(app)
                .get('/api/techniciens')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            if (response.body.items.length > 0) {
                expect(response.body.items[0].user).toBeDefined();
            }
        });
    });

    describe('GET /api/techniciens/:id', () => {
        let technicienId;

        beforeAll(async () => {
            const user = await User.create({
                email: `tech-specific-${Date.now()}@test.com`,
                password: 'password123',
                nom: 'Specific',
                prenom: 'Technician',
                roles: ['ROLE_TECHNICIEN'],
            });
            const technicien = await Technicien.create({
                userId: user.id,
                specialite: 'Specific Specialty',
                tauxHoraire: 75.00,
                statut: 'Disponible',
            });
            technicienId = technicien.id;
        });

        it('should return technician by ID with user info', async () => {
            const response = await request(app)
                .get(`/api/techniciens/${technicienId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(technicienId);
            expect(response.body.specialite).toBe('Specific Specialty');
            expect(response.body.user).toBeDefined();
        });

        it('should return 404 for non-existent technician', async () => {
            const response = await request(app)
                .get('/api/techniciens/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    // ========================================
    // UPDATE Tests
    // ========================================
    describe('PUT /api/techniciens/:id', () => {
        let technicienId;

        beforeAll(async () => {
            const user = await User.create({
                email: `tech-update-${Date.now()}@test.com`,
                password: 'password123',
                nom: 'Update',
                prenom: 'Test',
                roles: ['ROLE_TECHNICIEN'],
            });
            const technicien = await Technicien.create({
                userId: user.id,
                specialite: 'Old Specialty',
                tauxHoraire: 50.00,
                statut: 'Disponible',
            });
            technicienId = technicien.id;
        });

        it('should update technician and user fields', async () => {
            const response = await request(app)
                .put(`/api/techniciens/${technicienId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom: 'Updated Name',
                    prenom: 'Updated Prenom',
                    specialite: 'New Specialty',
                    tauxHoraire: 80.00,
                    statut: 'En intervention',
                });

            expect(response.status).toBe(200);
            expect(response.body.specialite).toBe('New Specialty');
            expect(parseFloat(response.body.tauxHoraire)).toBe(80.00);
            expect(response.body.statut).toBe('En intervention');
            expect(response.body.user.nom).toBe('Updated Name');
        });

        it('should return 404 for non-existent technician', async () => {
            const response = await request(app)
                .put('/api/techniciens/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ specialite: 'New' });

            expect(response.status).toBe(404);
        });
    });

    // ========================================
    // DELETE Tests
    // ========================================
    describe('DELETE /api/techniciens/:id', () => {
        let technicienId;
        let userId;

        beforeAll(async () => {
            const user = await User.create({
                email: `tech-delete-${Date.now()}@test.com`,
                password: 'password123',
                nom: 'Delete',
                prenom: 'Test',
                roles: ['ROLE_TECHNICIEN'],
            });
            userId = user.id;
            const technicien = await Technicien.create({
                userId: user.id,
                specialite: 'To Delete',
                tauxHoraire: 50.00,
                statut: 'Disponible',
            });
            technicienId = technicien.id;
        });

        it('should delete technician and associated user', async () => {
            const response = await request(app)
                .delete(`/api/techniciens/${technicienId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(204);

            // Verify both are deleted
            const checkTech = await Technicien.findByPk(technicienId);
            expect(checkTech).toBeNull();

            const checkUser = await User.findByPk(userId);
            expect(checkUser).toBeNull();
        });

        it('should return 404 for non-existent technician', async () => {
            const response = await request(app)
                .delete('/api/techniciens/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });
});
