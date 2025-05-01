const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { masterPool, replicaPool } = require('../config/database');
const logger = require('../config/logger');

// Create data (write to master)
router.post('/', [
    body('data').notEmpty().trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { data } = req.body;
        const result = await masterPool.query(
            'INSERT INTO test_table (data) VALUES ($1) RETURNING *',
            [data]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error('Write operation failed:', error);
        res.status(500).json({
            error: 'Write operation failed',
            message: error.message
        });
    }
});

// Read data (from replicas via NLB)
router.get('/', async (req, res) => {
    try {
        const result = await replicaPool.query(
            'SELECT * FROM test_table ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        logger.error('Read operation failed:', error);
        res.status(500).json({
            error: 'Read operation failed',
            message: error.message
        });
    }
});

// Get specific record
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await replicaPool.query(
            'SELECT * FROM test_table WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Read operation failed:', error);
        res.status(500).json({
            error: 'Read operation failed',
            message: error.message
        });
    }
});

// Update data (write to master)
router.put('/:id', [
    body('data').notEmpty().trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { id } = req.params;
        const { data } = req.body;
        const result = await masterPool.query(
            'UPDATE test_table SET data = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [data, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Update operation failed:', error);
        res.status(500).json({
            error: 'Update operation failed',
            message: error.message
        });
    }
});

// Delete data (write to master)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await masterPool.query(
            'DELETE FROM test_table WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        logger.error('Delete operation failed:', error);
        res.status(500).json({
            error: 'Delete operation failed',
            message: error.message
        });
    }
});

module.exports = router;