require('./telemetry');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const monitoringMiddleware = require('./middleware/monitoringMiddleware');
const logger = require('./logger');
const { appErrorCounter, normalizeRoute } = require('./metrics');

// Connect to Database
connectDB().catch((err) => console.error('Initial DB connection failed:', err.message));

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));
app.use(monitoringMiddleware);

// Ensure DB is connected for serverless invocations
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        next(err);
    }
});

// Routes
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/budget', require('./routes/budgetRoutes'));
app.use('/api/ai-insights', require('./routes/insightRoutes'));
app.use('/api/ai-chat', require('./routes/aiChatRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/receipts', require('./routes/receiptRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const errorType = err.name || 'InternalError';

    // Record error metrics without high-cardinality values
    try {
        const route = normalizeRoute(req.baseUrl + (req.route ? req.route.path : req.path));
        appErrorCounter.add(1, {
            'error.type': errorType,
            'http.status_code': status,
            'http.route': route
        });
    } catch (_) {}

    // Emit structured error log
    try {
        logger.error(`Error processing request: ${err.message}`, {
            error_class: errorType,
            http_status: status,
            path: req.originalUrl
        });
    } catch (_) {
        console.error(err.stack);
    }

    res.status(status).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port http://localhost:${PORT}`);
    });
}

module.exports = app;
