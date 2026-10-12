// Structured Logger with OpenTelemetry Logs API & Loki Integration
const { logs, SeverityNumber } = require('@opentelemetry/api-logs');
const { trace } = require('@opentelemetry/api');

const serviceName = process.env.OTEL_SERVICE_NAME || 'mern-backend';
const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const otelLogger = logs.getLogger('mern-backend', '1.0.0');

// Extract current active trace context if available
const getTraceContext = () => {
    try {
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
            const ctx = activeSpan.spanContext();
            if (ctx && ctx.traceId) {
                return {
                    trace_id: ctx.traceId,
                    span_id: ctx.spanId
                };
            }
        }
    } catch (_) {}
    return {};
};

const formatLog = (level, message, attributes = {}) => {
    const traceCtx = getTraceContext();
    return {
        timestamp: new Date().toISOString(),
        service: serviceName,
        environment,
        severity: level,
        message,
        ...traceCtx,
        ...attributes
    };
};

const log = (level, severityNumber, message, attributes = {}) => {
    const record = formatLog(level, message, attributes);

    // 1. Emit to OpenTelemetry (routes to OTLPLogExporter -> Grafana Loki)
    try {
        otelLogger.emit({
            severityNumber,
            severityText: level,
            body: message,
            attributes: {
                'service.name': serviceName,
                'deployment.environment': environment,
                ...record
            }
        });
    } catch (_) {
        // Safe suppression of telemetry log emission errors
    }

    // 2. Output to Console as structured JSON for Vercel platform logs
    const output = JSON.stringify(record);
    if (level === 'ERROR') {
        console.error(output);
    } else if (level === 'WARN') {
        console.warn(output);
    } else {
        console.log(output);
    }
};

const logger = {
    info: (msg, attrs) => log('INFO', SeverityNumber.INFO, msg, attrs),
    warn: (msg, attrs) => log('WARN', SeverityNumber.WARN, msg, attrs),
    error: (msg, attrs) => log('ERROR', SeverityNumber.ERROR, msg, attrs),
    debug: (msg, attrs) => log('DEBUG', SeverityNumber.DEBUG, msg, attrs)
};

module.exports = logger;
