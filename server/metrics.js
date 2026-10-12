// Application Metrics Module using OpenTelemetry Metrics API
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('mern-backend', '1.0.0');

// 1. HTTP Request Counter
const httpRequestCounter = meter.createCounter('app.http.requests', {
    description: 'Total count of completed HTTP requests',
    unit: '1'
});

// 2. HTTP Request Duration Histogram (Unit: seconds)
const httpRequestDuration = meter.createHistogram('app.http.request.duration', {
    description: 'Duration of HTTP requests in seconds',
    unit: 's'
});

// 3. Database Ping Duration Histogram (Unit: seconds)
const dbPingDuration = meter.createHistogram('app.db.ping.duration', {
    description: 'Latency of MongoDB ping health check in seconds',
    unit: 's'
});

// 4. Database Ping Failures Counter
const dbPingFailures = meter.createCounter('app.db.ping.failures', {
    description: 'Count of failed MongoDB ping health checks',
    unit: '1'
});

// 5. Application Errors Counter
const appErrorCounter = meter.createCounter('app.errors', {
    description: 'Total count of unhandled or server errors',
    unit: '1'
});

// Helper: Normalize Route Template to prevent high-cardinality label explosions
// Replaces MongoDB ObjectIds (24 hex chars) and integer IDs with ':id'
const normalizeRoute = (rawPath) => {
    if (!rawPath || typeof rawPath !== 'string') return 'unknown';

    let path = rawPath.split('?')[0]; // Strip query params

    // Replace 24-character hexadecimal MongoDB ObjectIds
    path = path.replace(/\b[0-9a-fA-F]{24}\b/g, ':id');

    // Replace UUIDs
    path = path.replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, ':id');

    // Replace pure numeric IDs
    path = path.replace(/\/\d+(?=\/|$)/g, '/:id');

    // Consolidate duplicate slashes
    path = path.replace(/\/+/g, '/');

    // Remove trailing slash if longer than root
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    return path || '/';
};

module.exports = {
    httpRequestCounter,
    httpRequestDuration,
    dbPingDuration,
    dbPingFailures,
    appErrorCounter,
    normalizeRoute
};
