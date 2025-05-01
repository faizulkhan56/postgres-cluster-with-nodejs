const express = require('express');
const router = express.Router();
const { masterPool, replicaPool } = require('../config/database');
const logger = require('../config/logger');

// Health check endpoint
router.get('/', async (req, res) => {
    try {
        // Check master connection
        const masterResult = await masterPool.query('SELECT NOW()');
        
        // Check replica connection
        const replicaResult = await replicaPool.query('SELECT NOW()');
        
        // Check replication lag
        const lagResult = await replicaPool.query(
            'SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag'
        );
        
        res.json({
            status: 'healthy',
            masterDb: 'connected',
            replicaDb: 'connected',
            replicationLag: lagResult.rows[0].replication_lag,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// Detailed health metrics
router.get('/metrics', async (req, res) => {
    try {
        const metrics = await replicaPool.query(`
            SELECT 
                client_addr,
                state,
                sent_lsn,
                write_lsn,
                flush_lsn,
                replay_lsn,
                write_lag,
                flush_lag,
                replay_lag
            FROM pg_stat_replication
        `);
        
        res.json({
            replicationStatus: metrics.rows
        });
    } catch (error) {
        logger.error('Metrics check failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;