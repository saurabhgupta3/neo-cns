const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Connect to in-memory database before all tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Disconnect from any existing connection
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to in-memory MongoDB');
});

// Clear all collections after each test
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Disconnect and stop MongoDB after all tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('🔌 Disconnected from in-memory MongoDB');
});

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';
