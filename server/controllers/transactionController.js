const Transaction = require('../models/Transaction');

const getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addTransaction = async (req, res) => {
    const { amount, type, category, date, notes } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    if (!type || !['income', 'expense'].includes(type)) {
        return res.status(400).json({ message: 'Type must be either income or expense' });
    }

    if (!category || !category.trim()) {
        return res.status(400).json({ message: 'Category is required' });
    }

    try {
        const transaction = await Transaction.create({
            userId: req.user,
            amount: Number(amount),
            type,
            category: category.trim(),
            date: date || new Date(),
            notes: notes ? notes.trim() : ''
        });
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'User not authorized' });
        }

        await transaction.deleteOne();
        res.json({ message: 'Transaction removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'User not authorized' });
        }

        const { amount, type, category, date, notes } = req.body;

        if (amount !== undefined) {
            if (isNaN(Number(amount)) || Number(amount) <= 0) {
                return res.status(400).json({ message: 'Amount must be a positive number' });
            }
            transaction.amount = Number(amount);
        }

        if (type !== undefined) {
            if (!['income', 'expense'].includes(type)) {
                return res.status(400).json({ message: 'Type must be either income or expense' });
            }
            transaction.type = type;
        }

        if (category !== undefined) {
            if (!category.trim()) {
                return res.status(400).json({ message: 'Category cannot be empty' });
            }
            transaction.category = category.trim();
        }

        if (date !== undefined) {
            transaction.date = date;
        }

        if (notes !== undefined) {
            transaction.notes = notes.trim();
        }

        const updatedTransaction = await transaction.save();
        res.json(updatedTransaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getTransactions, addTransaction, deleteTransaction, updateTransaction };
