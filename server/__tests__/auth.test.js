const request = require('supertest');
const app = require('../app');
const User = require('../models/user');

describe('Auth API', () => {
    
    // ========== REGISTER TESTS ==========
    describe('POST /api/auth/register', () => {
        
        it('should register a new user successfully', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    phone: '1234567890',
                    address: '123 Test Street'
                });
            
            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.user).toBeDefined();
            expect(res.body.user.email).toBe('test@example.com');
            expect(res.body.token).toBeDefined();
            expect(res.body.user.password).toBeUndefined(); // Password should not be returned
        });
        
        it('should fail registration with missing required fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com'
                    // Missing name and password
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
        
        it('should fail registration with invalid email format', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'invalid-email',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
        
        it('should fail registration with short password', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: '123' // Too short
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
        
        it('should fail registration with duplicate email', async () => {
            // First registration
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'duplicate@example.com',
                    password: 'password123'
                });
            
            // Second registration with same email
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Another User',
                    email: 'duplicate@example.com',
                    password: 'password456'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('already');
        });
    });
    
    // ========== LOGIN TESTS ==========
    describe('POST /api/auth/login', () => {
        
        beforeEach(async () => {
            // Create a user before each login test
            await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Login Test User',
                    email: 'login@example.com',
                    password: 'password123'
                });
        });
        
        it('should login successfully with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.token).toBeDefined();
            expect(res.body.user.email).toBe('login@example.com');
        });
        
        it('should fail login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
        
        it('should fail login with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
        
        it('should fail login with missing credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});
            
            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });
    });
    
    // ========== GET ME TESTS ==========
    describe('GET /api/auth/me', () => {
        
        let token;
        
        beforeEach(async () => {
            // Register and get token
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Me Test User',
                    email: 'me@example.com',
                    password: 'password123'
                });
            token = res.body.token;
        });
        
        it('should return current user with valid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe('me@example.com');
        });
        
        it('should fail without token', async () => {
            const res = await request(app)
                .get('/api/auth/me');
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
        
        it('should fail with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
    
    // ========== UPDATE PROFILE TESTS ==========
    describe('PUT /api/auth/profile', () => {
        
        let token;
        
        beforeEach(async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Profile Test User',
                    email: 'profile@example.com',
                    password: 'password123'
                });
            token = res.body.token;
        });
        
        it('should update user profile successfully', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Updated Name',
                    phone: '9876543210',
                    address: 'New Address'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.name).toBe('Updated Name');
            expect(res.body.user.phone).toBe('9876543210');
        });
        
        it('should fail update without token', async () => {
            const res = await request(app)
                .put('/api/auth/profile')
                .send({ name: 'New Name' });
            
            expect(res.statusCode).toBe(401);
        });
    });
    
    // ========== CHANGE PASSWORD TESTS ==========
    describe('PUT /api/auth/change-password', () => {
        
        let token;
        
        beforeEach(async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Password Test User',
                    email: 'password@example.com',
                    password: 'oldpassword123'
                });
            token = res.body.token;
        });
        
        it('should change password successfully', async () => {
            const res = await request(app)
                .put('/api/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: 'oldpassword123',
                    newPassword: 'newpassword456'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            
            // Verify can login with new password
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'password@example.com',
                    password: 'newpassword456'
                });
            
            expect(loginRes.statusCode).toBe(200);
        });
        
        it('should fail with wrong current password', async () => {
            const res = await request(app)
                .put('/api/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: 'wrongpassword',
                    newPassword: 'newpassword456'
                });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
