const express = require('express');
const router = express.Router();
const {
    getGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    addExpense,
    deleteExpense,
    recordSettlement,
    syncExpenseToPersonal
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getGroups)
    .post(protect, createGroup);

router.route('/:id')
    .get(protect, getGroupById)
    .put(protect, updateGroup)
    .delete(protect, deleteGroup);

router.post('/:id/expenses', protect, addExpense);
router.delete('/:id/expenses/:expenseId', protect, deleteExpense);
router.post('/:id/settle', protect, recordSettlement);
router.post('/:id/expenses/:expenseId/sync-personal', protect, syncExpenseToPersonal);

module.exports = router;
