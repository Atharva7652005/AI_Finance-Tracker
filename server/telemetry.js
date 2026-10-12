// OpenTelemetry SDK Initialization for MERN Backend
// Production-conscious configuration for Grafana Cloud & Vercel Serverless
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { defaultResource, resourceFromAttributes } = require('@opentelemetry/resources');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
const { trace } = require('@opentelemetry/api');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Prevent duplicate initialization in warm serverless containers
if (global.__otel_initialized) {
    module.exports = global.__otel_instance;
    return;
}

const isEnabled = process.env.OTEL_ENABLED !== 'false';
const serviceName = (process.env.OTEL_SERVICE_NAME || 'mern-backend').replace(/^=+/, '');
const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

// Parse comma-separated key=value attributes
function parseKeyValuePairs(raw) {
    if (!raw || typeof raw !== 'string') return {};
    const pairs = {};
    raw.split(',').forEach(item => {
        const idx = item.indexOf('=');
        if (idx !== -1) {
            const key = item.slice(0, idx).trim();
            const val = item.slice(idx + 1).trim();
            if (key && val) pairs[key] = val;
        }
    });
    return pairs;
}

let sdk = null;
let traceExporter = null;
let spanProcessor = null;
let metricExporter = null;
let metricReader = null;
let logExporter = null;
let logRecordProcessor = null;

if (isEnabled) {
    try {
        const rawEndpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '').trim();
        const baseEndpoint = rawEndpoint ? rawEndpoint.replace(/\/+$/, '') : null;
        const headers = parseKeyValuePairs(process.env.OTEL_EXPORTER_OTLP_HEADERS);
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

        spanProcessor = new BatchSpanProcessor(traceExporter, {
            maxQueueSize: 512,
            maxExportBatchSize: 64,
            scheduledDelayMillis: 2000,
            exportTimeoutMillis: timeoutMs
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

        // Parse custom resource attributes (e.g. service.namespace=..., deployment.environment=...)
        const customResourceAttrs = parseKeyValuePairs(process.env.OTEL_RESOURCE_ATTRIBUTES);

        // Construct resource attributes
        const resource = defaultResource().merge(
            resourceFromAttributes({
                'service.name': serviceName,
                'deployment.environment': environment,
                'service.version': '1.0.0',
                ...customResourceAttrs
            })
        );

        // Initialize NodeSDK with explicit spanProcessors so forceFlush can directly flush spans
        sdk = new NodeSDK({
            resource,
            spanProcessors: [spanProcessor],
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

        // 1. Flush Traces via BatchSpanProcessor
        if (spanProcessor && typeof spanProcessor.forceFlush === 'function') {
            flushTasks.push(spanProcessor.forceFlush().catch(() => {}));
        }

        // 2. Fallback TracerProvider flush
        try {
            const tp = trace.getTracerProvider();
            const delegate = tp && typeof tp.getDelegate === 'function' ? tp.getDelegate() : tp;
            if (delegate && typeof delegate.forceFlush === 'function' && delegate !== spanProcessor) {
                flushTasks.push(delegate.forceFlush().catch(() => {}));
            }
        } catch (_) {}

        // 3. Flush Metrics
        if (metricReader && typeof metricReader.forceFlush === 'function') {
            flushTasks.push(metricReader.forceFlush().catch(() => {}));
        }

        // 4. Flush Logs
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
    spanProcessor,
    metricReader,
    logRecordProcessor,
    flushTelemetry
};

global.__otel_initialized = true;
global.__otel_instance = telemetryModule;

module.exports = telemetryModule;
