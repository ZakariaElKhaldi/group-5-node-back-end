/**
 * Role & Permission Routes Tests (TDD)
 * Comprehensive tests for RBAC system
 * 
 * BEFORE: No Role/Permission models exist
 * TARGET: Dynamic role-based access control with granular permissions
 * 
 * Based on RBAC best practices:
 * - Roles have multiple permissions
 * - Users have one role (can be extended to many)
 * - Permissions are granular: resource.action format
 */

const request = require('supertest');
const app = require('../src/app.module');
const { Role, Permission, User } = require('../src/models');

describe('Role & Permission API', () => {
    let adminToken;
    let regularToken;
    let testRole;

    beforeAll(async () => {
        await global.ensureDbReady();

        const adminResult = await global.testUtils.createAdminUser();
        adminToken = adminResult.token;

        const userResult = await global.testUtils.createTestUser();
        regularToken = userResult.token;
    });

    afterAll(async () => {
        await Role.destroy({ where: { isSystem: false } });
    });

    // ========================================
    // PERMISSION Tests
    // ========================================
    describe('Permissions', () => {
        describe('GET /api/permissions', () => {
            it('should return all permissions for admin', async () => {
                const response = await request(app)
                    .get('/api/roles/permissions')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                // Should have default permissions
                expect(response.body.length).toBeGreaterThan(0);
            });

            it('should group permissions by category', async () => {
                const response = await request(app)
                    .get('/api/roles/permissions?grouped=true')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('machines');
            });

            it('should require admin role', async () => {
                const response = await request(app)
                    .get('/api/roles/permissions')
                    .set('Authorization', `Bearer ${regularToken}`);

                expect(response.status).toBe(403);
            });
        });
    });

    // ========================================
    // ROLE Tests
    // ========================================
    describe('Roles', () => {
        describe('GET /api/roles', () => {
            it('should return all roles for admin', async () => {
                const response = await request(app)
                    .get('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(200);
                expect(Array.isArray(response.body)).toBe(true);
                // Should have system roles
                expect(response.body.some(r => r.name === 'admin')).toBe(true);
            });

            it('should include permissions with each role', async () => {
                const response = await request(app)
                    .get('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(200);
                const adminRole = response.body.find(r => r.name === 'admin');
                expect(adminRole.permissions).toBeDefined();
            });

            it('should require admin role', async () => {
                const response = await request(app)
                    .get('/api/roles')
                    .set('Authorization', `Bearer ${regularToken}`);

                expect(response.status).toBe(403);
            });
        });

        describe('POST /api/roles', () => {
            it('should create a custom role with permissions', async () => {
                const response = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'super_technician',
                        displayName: 'Super Technician',
                        description: 'Technician with extended access',
                        permissions: ['machines.read', 'machines.update', 'workorders.read', 'workorders.update'],
                    });

                expect(response.status).toBe(201);
                expect(response.body.id).toBeDefined();
                expect(response.body.name).toBe('super_technician');
                expect(response.body.isSystem).toBe(false);
                testRole = response.body;
            });

            it('should prevent duplicate role names', async () => {
                const response = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'super_technician',
                        displayName: 'Duplicate',
                    });

                expect(response.status).toBe(400);
            });

            it('should require name field', async () => {
                const response = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        displayName: 'Missing Name',
                    });

                expect(response.status).toBe(400);
            });

            it('should require admin role', async () => {
                const response = await request(app)
                    .post('/api/roles')
                    .set('Authorization', `Bearer ${regularToken}`)
                    .send({ name: 'unauthorized' });

                expect(response.status).toBe(403);
            });
        });

        describe('GET /api/roles/:id', () => {
            it('should return role by ID with permissions', async () => {
                const response = await request(app)
                    .get(`/api/roles/${testRole.id}`)
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(200);
                expect(response.body.id).toBe(testRole.id);
                expect(Array.isArray(response.body.permissions)).toBe(true);
            });

            it('should return 404 for non-existent role', async () => {
                const response = await request(app)
                    .get('/api/roles/99999')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(404);
            });
        });

        describe('PUT /api/roles/:id', () => {
            it('should update role permissions', async () => {
                const response = await request(app)
                    .put(`/api/roles/${testRole.id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        displayName: 'Updated Super Tech',
                        permissions: ['machines.read', 'workorders.read', 'workorders.create'],
                    });

                expect(response.status).toBe(200);
                expect(response.body.displayName).toBe('Updated Super Tech');
            });

            it('should prevent modification of system roles', async () => {
                // Get admin role first
                const rolesRes = await request(app)
                    .get('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`);
                const adminRole = rolesRes.body.find(r => r.name === 'admin');

                const response = await request(app)
                    .put(`/api/roles/${adminRole.id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ permissions: [] });

                expect(response.status).toBe(403);
            });

            it('should return 404 for non-existent role', async () => {
                const response = await request(app)
                    .put('/api/roles/99999')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ displayName: 'New' });

                expect(response.status).toBe(404);
            });
        });

        describe('DELETE /api/roles/:id', () => {
            let deleteRoleId;

            beforeAll(async () => {
                const role = await Role.create({
                    name: `to-delete-${Date.now()}`,
                    displayName: 'To Delete',
                    permissions: [],
                    isSystem: false,
                });
                deleteRoleId = role.id;
            });

            it('should delete custom role', async () => {
                const response = await request(app)
                    .delete(`/api/roles/${deleteRoleId}`)
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(204);

                const check = await Role.findByPk(deleteRoleId);
                expect(check).toBeNull();
            });

            it('should prevent deletion of system roles', async () => {
                const rolesRes = await request(app)
                    .get('/api/roles')
                    .set('Authorization', `Bearer ${adminToken}`);
                const adminRole = rolesRes.body.find(r => r.name === 'admin');

                const response = await request(app)
                    .delete(`/api/roles/${adminRole.id}`)
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(403);
            });

            it('should return 404 for non-existent role', async () => {
                const response = await request(app)
                    .delete('/api/roles/99999')
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(404);
            });
        });
    });

    // ========================================
    // USER ROLE ASSIGNMENT Tests
    // ========================================
    describe('User Role Assignment', () => {
        let testUserId;

        beforeAll(async () => {
            const user = await User.create({
                email: `role-test-${Date.now()}@test.com`,
                password: 'password123',
                nom: 'Role',
                prenom: 'Test',
                roles: ['ROLE_USER'],
            });
            testUserId = user.id;
        });

        describe('PUT /api/users/:id/role', () => {
            it('should assign role to user', async () => {
                const response = await request(app)
                    .put(`/api/users/${testUserId}/role`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ roleId: testRole.id });

                expect(response.status).toBe(200);
                expect(response.body.roleId).toBe(testRole.id);
            });

            it('should require admin role', async () => {
                const response = await request(app)
                    .put(`/api/users/${testUserId}/role`)
                    .set('Authorization', `Bearer ${regularToken}`)
                    .send({ roleId: testRole.id });

                expect(response.status).toBe(403);
            });

            it('should return 404 for non-existent user', async () => {
                const response = await request(app)
                    .put('/api/users/99999/role')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({ roleId: testRole.id });

                expect(response.status).toBe(404);
            });
        });
    });
});
