/**
 * Piece Routes Tests (TDD)
 * Comprehensive tests for /api/pieces endpoints - Inventory Management
 * 
 * BEFORE: 13% coverage (13.97 lines)
 * TARGET: 80%+ coverage
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Piece, Fournisseur, MouvementStock } = require('../src/models');

describe('Piece API', () => {
    let adminToken;
    let testFournisseur;

    beforeAll(async () => {
        await global.ensureDbReady();

        const adminResult = await global.testUtils.createAdminUser();
        adminToken = adminResult.token;

        // Create test supplier
        testFournisseur = await Fournisseur.create({
            nom: 'Test Supplier',
            email: 'supplier@test.com',
            telephone: '123456789',
        });
    });

    afterAll(async () => {
        await MouvementStock.destroy({ where: {} });
        await Piece.destroy({ where: {} });
        await Fournisseur.destroy({ where: {} });
    });

    // ========================================
    // CREATE Tests
    // ========================================
    describe('POST /api/pieces', () => {
        it('should create a new piece with valid data', async () => {
            const response = await request(app)
                .post('/api/pieces')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reference: `REF-${Date.now()}`,
                    nom: 'Filtre à huile',
                    description: 'Filtre haute qualité',
                    prixUnitaire: 25.99,
                    quantiteStock: 100,
                    seuilAlerte: 10,
                    emplacement: 'Etagère A-1',
                    fournisseurId: testFournisseur.id,
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.nom).toBe('Filtre à huile');
            expect(response.body.quantiteStock).toBe(100);
            expect(response.body.fournisseur).toBeDefined();
        });

        it('should create initial stock movement when stock > 0', async () => {
            const response = await request(app)
                .post('/api/pieces')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reference: `REF-STOCK-${Date.now()}`,
                    nom: 'Piece with stock',
                    quantiteStock: 50,
                });

            expect(response.status).toBe(201);

            // Verify stock movement was created
            const movements = await MouvementStock.findAll({
                where: { pieceId: response.body.id },
            });
            expect(movements.length).toBe(1);
            expect(movements[0].type).toBe('entree');
            expect(movements[0].motif).toBe('Stock initial');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/pieces')
                .send({ nom: 'Unauthorized' });

            expect(response.status).toBe(401);
        });
    });

    // ========================================
    // READ Tests
    // ========================================
    describe('GET /api/pieces', () => {
        beforeAll(async () => {
            await Piece.bulkCreate([
                { reference: 'P-001', nom: 'Courroie', prixUnitaire: 15.00, quantiteStock: 50, seuilAlerte: 10 },
                { reference: 'P-002', nom: 'Roulement', prixUnitaire: 8.50, quantiteStock: 30, seuilAlerte: 5 },
                { reference: 'P-003', nom: 'Joint', prixUnitaire: 3.25, quantiteStock: 200, seuilAlerte: 20 },
            ]);
        });

        it('should return paginated list of pieces', async () => {
            const response = await request(app)
                .get('/api/pieces')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.total).toBeGreaterThanOrEqual(3);
            expect(response.body.page).toBe(1);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/pieces?page=1&limit=2')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.length).toBeLessThanOrEqual(2);
            expect(response.body.limit).toBe(2);
        });

        it('should support search by name or reference', async () => {
            const response = await request(app)
                .get('/api/pieces?search=Courroie')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.items.some(p => p.nom === 'Courroie')).toBe(true);
        });
    });

    describe('GET /api/pieces/:id', () => {
        let pieceId;

        beforeAll(async () => {
            const piece = await Piece.create({
                reference: `SPECIFIC-${Date.now()}`,
                nom: 'Specific Piece',
                prixUnitaire: 12.50,
                quantiteStock: 25,
                seuilAlerte: 5,
                fournisseurId: testFournisseur.id,
            });
            pieceId = piece.id;
        });

        it('should return piece by ID with supplier info', async () => {
            const response = await request(app)
                .get(`/api/pieces/${pieceId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(pieceId);
            expect(response.body.nom).toBe('Specific Piece');
            expect(response.body.fournisseur).toBeDefined();
        });

        it('should return 404 for non-existent piece', async () => {
            const response = await request(app)
                .get('/api/pieces/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });

    // ========================================
    // UPDATE Tests
    // ========================================
    describe('PUT /api/pieces/:id', () => {
        let pieceId;

        beforeAll(async () => {
            const piece = await Piece.create({
                reference: `UPDATE-${Date.now()}`,
                nom: 'Update Test Piece',
                prixUnitaire: 10.00,
                quantiteStock: 50,
                seuilAlerte: 5,
            });
            pieceId = piece.id;
        });

        it('should update piece fields', async () => {
            const response = await request(app)
                .put(`/api/pieces/${pieceId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    nom: 'Updated Piece Name',
                    prixUnitaire: 15.50,
                    seuilAlerte: 10,
                });

            expect(response.status).toBe(200);
            expect(response.body.nom).toBe('Updated Piece Name');
            expect(parseFloat(response.body.prixUnitaire)).toBe(15.50);
            expect(response.body.seuilAlerte).toBe(10);
        });

        it('should return 404 for non-existent piece', async () => {
            const response = await request(app)
                .put('/api/pieces/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ nom: 'New Name' });

            expect(response.status).toBe(404);
        });
    });

    // ========================================
    // STOCK MANAGEMENT Tests
    // ========================================
    describe('PATCH /api/pieces/:id/stock', () => {
        let pieceId;

        beforeEach(async () => {
            const piece = await Piece.create({
                reference: `STOCK-${Date.now()}`,
                nom: 'Stock Test Piece',
                prixUnitaire: 20.00,
                quantiteStock: 100,
                seuilAlerte: 10,
            });
            pieceId = piece.id;
        });

        it('should add stock (entree)', async () => {
            const response = await request(app)
                .patch(`/api/pieces/${pieceId}/stock`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'entree',
                    quantite: 50,
                    motif: 'Réapprovisionnement',
                });

            expect(response.status).toBe(200);
            expect(response.body.quantiteStock).toBe(150); // 100 + 50
        });

        it('should remove stock (sortie)', async () => {
            const response = await request(app)
                .patch(`/api/pieces/${pieceId}/stock`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'sortie',
                    quantite: 30,
                    motif: 'Utilisation intervention',
                });

            expect(response.status).toBe(200);
            expect(response.body.quantiteStock).toBe(70); // 100 - 30
        });

        it('should reject insufficient stock', async () => {
            const response = await request(app)
                .patch(`/api/pieces/${pieceId}/stock`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'sortie',
                    quantite: 999, // More than available
                    motif: 'Too much',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('insuffisant');
        });

        it('should reject invalid type', async () => {
            const response = await request(app)
                .patch(`/api/pieces/${pieceId}/stock`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'invalid',
                    quantite: 10,
                });

            expect(response.status).toBe(400);
        });

        it('should reject non-positive quantity', async () => {
            const response = await request(app)
                .patch(`/api/pieces/${pieceId}/stock`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'entree',
                    quantite: 0,
                });

            expect(response.status).toBe(400);
        });

        it('should record stock movement', async () => {
            await request(app)
                .patch(`/api/pieces/${pieceId}/stock`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'entree',
                    quantite: 25,
                    motif: 'Test movement',
                });

            const movements = await MouvementStock.findAll({
                where: { pieceId },
                order: [['createdAt', 'DESC']],
            });

            expect(movements.length).toBeGreaterThanOrEqual(1);
            expect(movements[0].type).toBe('entree');
            expect(movements[0].quantite).toBe(25);
            expect(movements[0].quantiteAvant).toBe(100);
            expect(movements[0].quantiteApres).toBe(125);
        });

        it('should return 404 for non-existent piece', async () => {
            const response = await request(app)
                .patch('/api/pieces/99999/stock')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    type: 'entree',
                    quantite: 10,
                });

            expect(response.status).toBe(404);
        });
    });

    // ========================================
    // DELETE Tests
    // ========================================
    describe('DELETE /api/pieces/:id', () => {
        let pieceId;

        beforeAll(async () => {
            const piece = await Piece.create({
                reference: `DELETE-${Date.now()}`,
                nom: 'Delete Test Piece',
                prixUnitaire: 5.00,
                quantiteStock: 10,
                seuilAlerte: 2,
            });
            pieceId = piece.id;
        });

        it('should delete piece', async () => {
            const response = await request(app)
                .delete(`/api/pieces/${pieceId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(204);

            const check = await Piece.findByPk(pieceId);
            expect(check).toBeNull();
        });

        it('should return 404 for non-existent piece', async () => {
            const response = await request(app)
                .delete('/api/pieces/99999')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(404);
        });
    });
});
