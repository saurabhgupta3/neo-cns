const request = require('supertest');
const app = require('../app');
const User = require('../models/user');
const Order = require('../models/order');

describe('Orders API', () => {
    
    let userToken;
    let adminToken;
    let userId;
    let adminId;
    
    // Create test users before tests
    beforeEach(async () => {
        // Create regular user
        const userRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'user@example.com',
                password: 'password123'
            });
        userToken = userRes.body.token;
        userId = userRes.body.user._id;
        
        // Create admin user directly in DB
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'password123',
            role: 'admin'
        });
        adminId = adminUser._id;
        
        // Login as admin to get token
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@example.com',
                password: 'password123'
            });
        adminToken = adminRes.body.token;
    });
    
    // ========== CREATE ORDER TESTS ==========
    describe('POST /api/orders', () => {
        
        it('should create an order successfully', async () => {
            const res = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'John Sender',
                    receiverName: 'Jane Receiver',
                    pickupAddress: '123 Pickup St, City A',
                    deliveryAddress: '456 Delivery Ave, City B',
                    weight: 2.5
                });
            
            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.order).toBeDefined();
            expect(res.body.order.senderName).toBe('John Sender');
            expect(res.body.order.status).toBe('Pending');
            expect(res.body.order.price).toBeGreaterThan(0);
        });
        
        it('should fail without authentication', async () => {
            const res = await request(app)
                .post('/api/orders')
                .send({
                    senderName: 'John Sender',
                    receiverName: 'Jane Receiver',
                    pickupAddress: '123 Pickup St',
                    deliveryAddress: '456 Delivery Ave',
                    weight: 2.5
                });
            
            expect(res.statusCode).toBe(401);
        });
        
        it('should fail with missing required fields', async () => {
            const res = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'John Sender'
                    // Missing other required fields
                });
            
            expect(res.statusCode).toBe(400);
        });
    });
    
    // ========== GET ORDERS TESTS ==========
    describe('GET /api/orders', () => {
        
        beforeEach(async () => {
            // Create a test order
            await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'John Sender',
                    receiverName: 'Jane Receiver',
                    pickupAddress: '123 Pickup St',
                    deliveryAddress: '456 Delivery Ave',
                    weight: 2.5
                });
        });
        
        it('should get user orders successfully', async () => {
            const res = await request(app)
                .get('/api/orders')
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.orders).toBeDefined();
            expect(Array.isArray(res.body.orders)).toBe(true);
            expect(res.body.orders.length).toBeGreaterThan(0);
        });
        
        it('should get all orders for admin', async () => {
            const res = await request(app)
                .get('/api/orders')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.orders).toBeDefined();
        });
        
        it('should fail without authentication', async () => {
            const res = await request(app)
                .get('/api/orders');
            
            expect(res.statusCode).toBe(401);
        });
    });
    
    // ========== GET SINGLE ORDER TESTS ==========
    describe('GET /api/orders/:id', () => {
        
        let orderId;
        
        beforeEach(async () => {
            const orderRes = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'John Sender',
                    receiverName: 'Jane Receiver',
                    pickupAddress: '123 Pickup St',
                    deliveryAddress: '456 Delivery Ave',
                    weight: 2.5
                });
            orderId = orderRes.body.order._id;
        });
        
        it('should get single order successfully', async () => {
            const res = await request(app)
                .get(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.order._id).toBe(orderId);
        });
        
        it('should fail with invalid order ID', async () => {
            const res = await request(app)
                .get('/api/orders/invalidid')
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(400);
        });
        
        it('should fail with non-existent order ID', async () => {
            const res = await request(app)
                .get('/api/orders/507f1f77bcf86cd799439011')
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });
    
    // ========== UPDATE ORDER TESTS ==========
    describe('PUT /api/orders/:id', () => {
        
        let orderId;
        
        beforeEach(async () => {
            const orderRes = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'John Sender',
                    receiverName: 'Jane Receiver',
                    pickupAddress: '123 Pickup St',
                    deliveryAddress: '456 Delivery Ave',
                    weight: 2.5
                });
            orderId = orderRes.body.order._id;
        });
        
        it('should update order successfully', async () => {
            const res = await request(app)
                .put(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'Updated Sender',
                    weight: 5.0
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.order.senderName).toBe('Updated Sender');
        });
        
        it('admin should update any order', async () => {
            const res = await request(app)
                .put(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    senderName: 'Admin Updated'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.order.senderName).toBe('Admin Updated');
        });
    });
    
    // ========== DELETE ORDER TESTS ==========
    describe('DELETE /api/orders/:id', () => {
        
        let orderId;
        
        beforeEach(async () => {
            const orderRes = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'John Sender',
                    receiverName: 'Jane Receiver',
                    pickupAddress: '123 Pickup St',
                    deliveryAddress: '456 Delivery Ave',
                    weight: 2.5
                });
            orderId = orderRes.body.order._id;
        });
        
        it('should delete pending order successfully', async () => {
            const res = await request(app)
                .delete(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            
            // Verify order is deleted
            const getRes = await request(app)
                .get(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${userToken}`);
            
            expect(getRes.statusCode).toBe(404);
        });
        
        it('admin should delete any order', async () => {
            const res = await request(app)
                .delete(`/api/orders/${orderId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
    
    // ========== UPDATE ORDER STATUS TESTS (Admin/Courier) ==========
    describe('PUT /api/orders/:id/status', () => {
        
        let orderId;
        
        beforeEach(async () => {
            const orderRes = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    senderName: 'John Sender',
                    receiverName: 'Jane Receiver',
                    pickupAddress: '123 Pickup St',
                    deliveryAddress: '456 Delivery Ave',
                    weight: 2.5
                });
            orderId = orderRes.body.order._id;
        });
        
        it('admin should update order status', async () => {
            const res = await request(app)
                .put(`/api/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    status: 'Confirmed'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.order.status).toBe('Confirmed');
        });
        
        it('regular user should not update order status', async () => {
            const res = await request(app)
                .put(`/api/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    status: 'Confirmed'
                });
            
            expect(res.statusCode).toBe(403);
        });
    });
});
