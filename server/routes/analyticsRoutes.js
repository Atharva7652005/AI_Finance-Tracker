const express = require('express');
const router = express.Router();
const { getAnalyticsStudio } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.get('/studio', protect, getAnalyticsStudio);

module.exports = router;
