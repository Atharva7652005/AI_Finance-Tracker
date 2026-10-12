// Express Monitoring Middleware for Metrics and Structured Logging
const { httpRequestCounter, httpRequestDuration, normalizeRoute } = require('../metrics');
const logger = require('../logger');
const { flushTelemetry } = require('../telemetry');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const monitoringMiddleware = (req, res, next) => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
        try {
            const endTime = process.hrtime.bigint();
            const durationSec = Number(endTime - startTime) / 1e9;
            const durationMs = Math.round(durationSec * 1000);

            // Determine normalized route template
            const rawPath = req.baseUrl 
                ? `${req.baseUrl}${req.route ? req.route.path : req.path}` 
                : (req.route ? req.route.path : req.path);
            const route = normalizeRoute(rawPath);

            const method = req.method.toUpperCase();
            const statusCode = res.statusCode;

            const metricLabels = {
                'http.request.method': method,
                'http.route': route,
                'http.response.status_code': statusCode
            };

            // 1. Record Metrics
            httpRequestCounter.add(1, metricLabels);
            httpRequestDuration.record(durationSec, metricLabels);

            // 2. Structured Log Record
            const logAttrs = {
                'http.method': method,
                'http.route': route,
                'http.status_code': statusCode,
                duration_ms: durationMs
            };

            const logMessage = `HTTP ${method} ${route} ${statusCode} - ${durationMs}ms`;

            if (statusCode >= 500) {
                logger.error(logMessage, logAttrs);
            } else if (statusCode >= 400) {
                logger.warn(logMessage, logAttrs);
            } else {
                logger.info(logMessage, logAttrs);
            }

            // 3. For Vercel Serverless: bounded telemetry flush
            if (isServerless) {
                flushTelemetry(800).catch(() => {});
            }
        } catch (_) {
            // Protect request completion from telemetry hook errors
        }
    });

    next();
};

module.exports = monitoringMiddleware;
