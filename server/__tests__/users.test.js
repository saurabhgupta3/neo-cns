const request = require('supertest');
const app = require('../app');
const User = require('../models/user');

describe('Users API (Admin Only)', () => {
    
    let adminToken;
    let userToken;
    let testUserId;
    
    beforeEach(async () => {
        // Create admin user
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'password123',
            role: 'admin'
        });
        
        // Login as admin
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@example.com',
                password: 'password123'
            });
        adminToken = adminRes.body.token;
        
        // Create regular user for testing
        const userRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Regular User',
                email: 'user@example.com',
                password: 'password123'
            });
        userToken = userRes.body.token;
        testUserId = userRes.body.user._id;
    });
    
    // ========== GET ALL USERS TESTS ==========
    describe('GET /api/users', () => {
        
        it('admin should get all users', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.users).toBeDefined();
            expect(Array.isArray(res.body.users)).toBe(true);
            expect(res.body.users.length).toBeGreaterThan(0);
        });
        
        it('regular user should not access users list', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(403);
        });
        
        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/users');
            
            expect(res.statusCode).toBe(401);
        });
        
        it('should filter users by role', async () => {
            const res = await request(app)
                .get('/api/users?role=admin')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            res.body.users.forEach(user => {
                expect(user.role).toBe('admin');
            });
        });
        
        it('should search users by name or email', async () => {
            const res = await request(app)
                .get('/api/users?search=Regular')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.users.length).toBeGreaterThan(0);
        });
    });
    
    // ========== GET SINGLE USER TESTS ==========
    describe('GET /api/users/:id', () => {
        
        it('admin should get single user', async () => {
            const res = await request(app)
                .get(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe('user@example.com');
        });
        
        it('should return 404 for non-existent user', async () => {
            const res = await request(app)
                .get('/api/users/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });
    
    // ========== UPDATE USER TESTS ==========
    describe('PUT /api/users/:id', () => {
        
        it('admin should update user details', async () => {
            const res = await request(app)
                .put(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Updated User Name',
                    phone: '9876543210'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.name).toBe('Updated User Name');
        });
    });
    
    // ========== CHANGE USER ROLE TESTS ==========
    describe('PUT /api/users/:id/role', () => {
        
        it('admin should change user role', async () => {
            const res = await request(app)
                .put(`/api/users/${testUserId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'courier' });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.role).toBe('courier');
        });
        
        it('should reject invalid role', async () => {
            const res = await request(app)
                .put(`/api/users/${testUserId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: 'invalid-role' });
            
            expect(res.statusCode).toBe(400);
        });
    });
    
    // ========== TOGGLE USER ACTIVE TESTS ==========
    describe('PUT /api/users/:id/toggle-active', () => {
        
        it('admin should toggle user active status', async () => {
            // First toggle (deactivate)
            const res1 = await request(app)
                .put(`/api/users/${testUserId}/toggle-active`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res1.statusCode).toBe(200);
            expect(res1.body.user.isActive).toBe(false);
            
            // Second toggle (activate)
            const res2 = await request(app)
                .put(`/api/users/${testUserId}/toggle-active`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res2.statusCode).toBe(200);
            expect(res2.body.user.isActive).toBe(true);
        });
    });
    
    // ========== DELETE USER TESTS ==========
    describe('DELETE /api/users/:id', () => {
        
        it('admin should soft delete user', async () => {
            const res = await request(app)
                .delete(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            
            // Verify user is soft deleted
            const user = await User.findById(testUserId);
            expect(user.deletedAt).toBeDefined();
            expect(user.isActive).toBe(false);
        });
        
        it('should not delete last admin', async () => {
            // Get admin user ID
            const adminUser = await User.findOne({ email: 'admin@example.com' });
            
            const res = await request(app)
                .delete(`/api/users/${adminUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toContain('last admin');
        });
    });
    
    // ========== RESTORE USER TESTS ==========
    describe('PUT /api/users/:id/restore', () => {
        
        it('admin should restore deleted user', async () => {
            // First delete the user
            await request(app)
                .delete(`/api/users/${testUserId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            // Then restore
            const res = await request(app)
                .put(`/api/users/${testUserId}/restore`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.isActive).toBe(true);
            expect(res.body.user.deletedAt).toBeNull();
        });
        
        it('should fail to restore non-deleted user', async () => {
            const res = await request(app)
                .put(`/api/users/${testUserId}/restore`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(400);
        });
    });
    
    // ========== GET COURIERS TESTS ==========
    describe('GET /api/users/couriers', () => {
        
        beforeEach(async () => {
            // Create a courier
            await User.create({
                name: 'Test Courier',
                email: 'courier@example.com',
                password: 'password123',
                role: 'courier',
                isAvailable: true
            });
        });
        
        it('admin should get available couriers', async () => {
            const res = await request(app)
                .get('/api/users/couriers')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.couriers).toBeDefined();
        });
    });
    
    // ========== USER STATS TESTS ==========
    describe('GET /api/users/stats/summary', () => {
        
        it('admin should get user statistics', async () => {
            const res = await request(app)
                .get('/api/users/stats/summary')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.stats).toBeDefined();
            expect(res.body.stats.total).toBeGreaterThan(0);
        });
    });
});
