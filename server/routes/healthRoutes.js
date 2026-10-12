const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { dbPingDuration, dbPingFailures } = require('../metrics');
const logger = require('../logger');

// GET /api/health
router.get('/', async (req, res) => {
    const startTime = process.hrtime.bigint();

    try {
        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            throw new Error('Database connection is not ready');
        }

        // Bounded ping to MongoDB admin database
        await mongoose.connection.db.admin().ping();

        const durationSec = Number(process.hrtime.bigint() - startTime) / 1e9;
        const durationMs = Math.round(durationSec * 1000);

        dbPingDuration.record(durationSec, { status: 'success' });

        return res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            latency_ms: durationMs
        });
    } catch (err) {
        const durationSec = Number(process.hrtime.bigint() - startTime) / 1e9;

        dbPingDuration.record(durationSec, { status: 'failure' });
        dbPingFailures.add(1, { reason: 'ping_failed' });

        logger.error('Database health check ping failed', {
            error_class: err.name || 'Error',
            duration_ms: Math.round(durationSec * 1000)
        });

        return res.status(503).json({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            database: 'unavailable'
        });
    }
});

module.exports = router;
