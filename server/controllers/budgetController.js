const Budget = require('../models/Budget');

const getBudget = async (req, res) => {
    try {
        const budget = await Budget.findOne({ userId: req.user });
        res.json(budget || { monthlyLimit: 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const setBudget = async (req, res) => {
    const { monthlyLimit } = req.body;

    if (monthlyLimit === undefined || isNaN(Number(monthlyLimit)) || Number(monthlyLimit) < 0) {
        return res.status(400).json({ message: 'Monthly limit must be a valid non-negative number' });
    }

    try {
        let budget = await Budget.findOne({ userId: req.user });
        const numericLimit = Number(monthlyLimit);

        if (budget) {
            budget.monthlyLimit = numericLimit;
            await budget.save();
        } else {
            budget = await Budget.create({
                userId: req.user,
                monthlyLimit: numericLimit
            });
        }

        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBudget, setBudget };
