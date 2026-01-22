module.exports = {
    JWT_SECRET: process.env.JWT_SECRET || "neo-cns-super-secret-key-change-in-production",
    JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
    NODE_ENV: process.env.NODE_ENV || "development",
    BCRYPT_SALT_ROUNDS: 12
};
