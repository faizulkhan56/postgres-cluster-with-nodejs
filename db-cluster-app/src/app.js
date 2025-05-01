require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { masterPool, replicaPool } = require('./config/database');
const logger = require('./config/logger');
const healthRoutes = require('./routes/health');
const dataRoutes = require('./routes/data');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/data', dataRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});