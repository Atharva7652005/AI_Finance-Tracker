// OpenTelemetry SDK Initialization for MERN Backend
// Production-conscious configuration for Grafana Cloud & Vercel Serverless
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { defaultResource, resourceFromAttributes } = require('@opentelemetry/resources');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Prevent duplicate initialization in warm serverless containers
if (global.__otel_initialized) {
    module.exports = global.__otel_instance;
    return;
}

const isEnabled = process.env.OTEL_ENABLED !== 'false';
const serviceName = process.env.OTEL_SERVICE_NAME || 'mern-backend';
const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

// Parse OTEL_EXPORTER_OTLP_HEADERS (e.g. "Authorization=Basic <token>")
function parseOtelHeaders(raw) {
    if (!raw || typeof raw !== 'string') return {};
    const headers = {};
    raw.split(',').forEach(pair => {
        const idx = pair.indexOf('=');
        if (idx !== -1) {
            const key = pair.slice(0, idx).trim();
            const val = pair.slice(idx + 1).trim();
            if (key && val) headers[key] = val;
        }
    });
    return headers;
}

let sdk = null;
let traceExporter = null;
let metricExporter = null;
let metricReader = null;
let logExporter = null;
let logRecordProcessor = null;

if (isEnabled) {
    try {
        const rawEndpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '').trim();
        const baseEndpoint = rawEndpoint ? rawEndpoint.replace(/\/+$/, '') : null;
        const headers = parseOtelHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);
        const timeoutMs = Math.min(Math.max(Number(process.env.OTEL_EXPORT_TIMEOUT_MS) || 5000, 1000), 10000);
        const metricsIntervalMs = Math.min(Math.max(Number(process.env.OTEL_METRICS_EXPORT_INTERVAL_MS) || 60000, 5000), 300000);

        // Build signal-specific URLs safely without double-appending paths
        const resolveSignalUrl = (signalPath) => {
            if (!baseEndpoint) return undefined;
            if (baseEndpoint.endsWith(signalPath)) return baseEndpoint;
            return `${baseEndpoint}${signalPath}`;
        };

        const traceUrl = resolveSignalUrl('/v1/traces');
        const metricUrl = resolveSignalUrl('/v1/metrics');
        const logUrl = resolveSignalUrl('/v1/logs');

        // Create exporters
        traceExporter = new OTLPTraceExporter({
            ...(traceUrl ? { url: traceUrl } : {}),
            headers,
            timeoutMillis: timeoutMs
        });

        metricExporter = new OTLPMetricExporter({
            ...(metricUrl ? { url: metricUrl } : {}),
            headers,
            timeoutMillis: timeoutMs
        });

        metricReader = new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: metricsIntervalMs,
            exportTimeoutMillis: timeoutMs
        });

        logExporter = new OTLPLogExporter({
            ...(logUrl ? { url: logUrl } : {}),
            headers,
            timeoutMillis: timeoutMs
        });

        logRecordProcessor = new BatchLogRecordProcessor(logExporter, {
            maxQueueSize: 512,
            maxExportBatchSize: 64,
            scheduledDelayMillis: 2000,
            exportTimeoutMillis: timeoutMs
        });

        // Construct resource attributes
        const resource = defaultResource().merge(
            resourceFromAttributes({
                'service.name': serviceName,
                'deployment.environment': environment,
                'service.version': '1.0.0'
            })
        );

        // Initialize NodeSDK
        sdk = new NodeSDK({
            resource,
            traceExporter,
            metricReader,
            logRecordProcessors: [logRecordProcessor],
            instrumentations: [
                getNodeAutoInstrumentations({
                    // Disable noisy filesystem instrumentation for serverless performance
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                    '@opentelemetry/instrumentation-http': { enabled: true },
                    '@opentelemetry/instrumentation-express': { enabled: true },
                    '@opentelemetry/instrumentation-mongoose': { enabled: true }
                })
            ]
        });

        sdk.start();
        console.log(`[OpenTelemetry] Initialized for service: ${serviceName} (${environment})`);
    } catch (err) {
        console.error('[OpenTelemetry] Initialization failed safely (app continues):', err.message);
        sdk = null;
    }
} else {
    console.log('[OpenTelemetry] Disabled via OTEL_ENABLED=false');
}

// Bounded flush utility for serverless invocations
const flushTelemetry = async (maxWaitMs = 1200) => {
    if (!isEnabled || !sdk) return;

    try {
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, maxWaitMs));
        const flushTasks = [];

        if (traceExporter && typeof traceExporter.forceFlush === 'function') {
            flushTasks.push(traceExporter.forceFlush().catch(() => {}));
        }
        if (metricReader && typeof metricReader.forceFlush === 'function') {
            flushTasks.push(metricReader.forceFlush().catch(() => {}));
        }
        if (logRecordProcessor && typeof logRecordProcessor.forceFlush === 'function') {
            flushTasks.push(logRecordProcessor.forceFlush().catch(() => {}));
        }

        await Promise.race([
            Promise.all(flushTasks),
            timeoutPromise
        ]);
    } catch (err) {
        // Suppress telemetry flush errors to protect user requests
    }
};

const telemetryModule = {
    sdk,
    isEnabled,
    flushTelemetry
};

global.__otel_initialized = true;
global.__otel_instance = telemetryModule;

module.exports = telemetryModule;
