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

    try {
        let budget = await Budget.findOne({ userId: req.user });

        if (budget) {
            budget.monthlyLimit = monthlyLimit;
            await budget.save();
        } else {
            budget = await Budget.create({
                userId: req.user,
                monthlyLimit
            });
        }

        res.json(budget);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBudget, setBudget };
