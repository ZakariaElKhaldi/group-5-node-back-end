/**
 * Fournisseur Routes Tests (TDD)
 * Comprehensive tests for /api/fournisseurs endpoints - Supplier Management
 * 
 * BEFORE: 17% coverage
 * TARGET: 80%+ coverage
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Fournisseur, Piece } = require('../src/models');

describe('Fournisseur API', () => {
    let adminToken;

    beforeAll(async () => {
        await global.ensureDbReady();

        const adminResult = await global.testUtils.createAdminUser();
        adminToken = adminResult.token;
    });

    afterAll(async () => {
        await Piece.destroy({ where: {} });
        await Fournisseur.destroy({ where: {} });
    });

    // ========================================
    // CREATE Tests
    // ========================================
    describe('POST /api/fournisseurs', () => {
        it('should create a new fournisseur with valid data', async () => {
            const response = await request(app)
                .post('/api/fournisseurs')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom: 'ACME Supplies',
                    email: 'contact@acme.com',
                    telephone: '+212 600 111 222',
                    adresse: '123 Industrial Zone',
                    ville: 'Casablanca',
                    pays: 'Morocco',
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.nom).toBe('ACME Supplies');
            expect(response.body.email).toBe('contact@acme.com');
        });

        it('should require nom field', async () => {
            const response = await request(app)
                .post('/api/fournisseurs')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    email: 'missing@nom.com',
                });

            // Accepts 400 or 500 (Sequelize validation)
            expect([400, 500]).toContain(response.status);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/fournisseurs')
                .send({ nom: 'No Auth' });

            expect(response.status).toBe(401);
        });
    });

    // ========================================
    // READ Tests
    // ========================================
    describe('GET /api/fournisseurs', () => {
        beforeAll(async () => {
            await Fournisseur.bulkCreate([
                { nom: 'Supplier Alpha', email: 'alpha@supplier.com', telephone: '111' },
                { nom: 'Supplier Beta', email: 'beta@supplier.com', telephone: '222' },
                { nom: 'Supplier Gamma', email: 'gamma@supplier.com', telephone: '333' },
            ]);
        });

        it('should return paginated list of fournisseurs', async () => {
            const response = await request(app)
                .get('/api/fournisseurs')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.total).toBeGreaterThanOrEqual(3);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/fournisseurs?page=1&limit=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeLessThanOrEqual(2);
            expect(response.body.page).toBe(1);
        });

        it('should support search by name', async () => {
            const response = await request(app)
                .get('/api/fournisseurs?search=Alpha')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.some(f => f.nom.includes('Alpha'))).toBe(true);
        });
    });

    describe('GET /api/fournisseurs/:id', () => {
        let fournisseurId;

        beforeAll(async () => {
            const fournisseur = await Fournisseur.create({
                nom: 'Specific Supplier',
                email: 'specific@supplier.com',
                telephone: '555',
            });
            fournisseurId = fournisseur.id;
        });

        it('should return fournisseur by ID', async () => {
            const response = await request(app)
                .get(`/api/fournisseurs/${fournisseurId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(fournisseurId);
            expect(response.body.nom).toBe('Specific Supplier');
        });

        it('should return 404 for non-existent fournisseur', async () => {
            const response = await request(app)
                .get('/api/fournisseurs/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    // ========================================
    // UPDATE Tests
    // ========================================
    describe('PUT /api/fournisseurs/:id', () => {
        let fournisseurId;

        beforeAll(async () => {
            const fournisseur = await Fournisseur.create({
                nom: 'Update Test Supplier',
                email: 'update@test.com',
                telephone: '666',
            });
            fournisseurId = fournisseur.id;
        });

        it('should update fournisseur fields', async () => {
            const response = await request(app)
                .put(`/api/fournisseurs/${fournisseurId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom: 'Updated Supplier Name',
                    telephone: '777',
                    ville: 'Rabat',
                });

            expect(response.status).toBe(200);
            expect(response.body.nom).toBe('Updated Supplier Name');
            expect(response.body.telephone).toBe('777');
        });

        it('should return 404 for non-existent fournisseur', async () => {
            const response = await request(app)
                .put('/api/fournisseurs/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nom: 'New Name' });

            expect(response.status).toBe(404);
        });
    });

    // ========================================
    // DELETE Tests
    // ========================================
    describe('DELETE /api/fournisseurs/:id', () => {
        let fournisseurId;

        beforeAll(async () => {
            const fournisseur = await Fournisseur.create({
                nom: 'Delete Test Supplier',
                email: 'delete@test.com',
                telephone: '888',
            });
            fournisseurId = fournisseur.id;
        });

        it('should delete fournisseur', async () => {
            const response = await request(app)
                .delete(`/api/fournisseurs/${fournisseurId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(204);

            const check = await Fournisseur.findByPk(fournisseurId);
            expect(check).toBeNull();
        });

        it('should return 404 for non-existent fournisseur', async () => {
            const response = await request(app)
                .delete('/api/fournisseurs/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });
});
