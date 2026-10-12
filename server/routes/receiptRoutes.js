const express = require('express');
const router = express.Router();
const { scanReceipt } = require('../controllers/receiptController');
const { protect } = require('../middleware/authMiddleware');

router.post('/scan', protect, scanReceipt);

module.exports = router;
