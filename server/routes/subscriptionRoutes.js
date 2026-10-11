const express = require('express');
const router = express.Router();
const {
    getSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    getUpcomingBills,
    detectSubscriptions
} = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getSubscriptions)
    .post(protect, createSubscription);

router.get('/upcoming', protect, getUpcomingBills);
router.get('/detect', protect, detectSubscriptions);

router.route('/:id')
    .put(protect, updateSubscription)
    .delete(protect, deleteSubscription);

module.exports = router;
