require('../server/telemetry');
const { flushTelemetry } = require('../server/telemetry');
const app = require('../server/server');

// Production serverless handler: ensures spans, metrics, and logs are flushed before Vercel freezes execution
module.exports = async (req, res) => {
    await new Promise((resolve) => {
        let settled = false;
        const done = () => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };

        res.once('finish', done);
        res.once('close', done);

        // Safety fallback timer so request never hangs if connection aborts
        setTimeout(done, 14000);

        app(req, res);
    });

    // Explicitly flush all pending spans, metrics, and logs before Vercel freezes the container!
    try {
        await flushTelemetry(1200);
    } catch (_) {
        // Suppress flush error to protect response
    }
};

