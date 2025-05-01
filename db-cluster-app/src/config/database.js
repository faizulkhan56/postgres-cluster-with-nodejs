const { Pool } = require('pg');
const logger = require('./logger');

// Master pool for write operations
const masterPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.MASTER_DB_HOST, // master db host IP
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: process.env.MAX_POOL_SIZE,
    idleTimeoutMillis: process.env.IDLE_TIMEOUT,
    connectionTimeoutMillis: 2000,
});

// Replica pool for read operations (via NLB)
const replicaPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.READ_REPLICA_HOST, // NLB DNS name
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    max: process.env.MAX_POOL_SIZE,
    idleTimeoutMillis: process.env.IDLE_TIMEOUT,
    connectionTimeoutMillis: 2000,
});

// Event handlers for master pool
masterPool.on('error', (err, client) => {
    logger.error('Unexpected error on master idle client', err);
});

masterPool.on('connect', (client) => {
    logger.info('New client connected to master');
});

// Event handlers for replica pool
replicaPool.on('error', (err, client) => {
    logger.error('Unexpected error on replica idle client', err);
});

replicaPool.on('connect', (client) => {
    logger.info('New client connected to replica');
});

module.exports = {
    masterPool,
    replicaPool
};