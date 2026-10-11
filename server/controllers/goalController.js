const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');
const getOpenAIClient = require('../config/openai');

const getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user }).sort({ status: 1, deadline: 1 });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createGoal = async (req, res) => {
    const { title, targetAmount, deadline, category, color, currentAmount } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Goal title is required' });
    }

    const numericTarget = Number(targetAmount);
    if (!numericTarget || numericTarget <= 0) {
        return res.status(400).json({ message: 'Target amount must be greater than 0' });
    }

    if (!deadline) {
        return res.status(400).json({ message: 'Target deadline date is required' });
    }

    try {
        const goal = await Goal.create({
            userId: req.user,
            title: title.trim(),
            targetAmount: numericTarget,
            currentAmount: Math.max(Number(currentAmount) || 0, 0),
            deadline: new Date(deadline),
            category: category ? category.trim() : 'General',
            color: color || '#6366f1'
        });

        res.status(201).json(goal);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateGoal = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        if (goal.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { title, targetAmount, deadline, category, color, status } = req.body;
        if (title !== undefined) goal.title = title.trim();
        if (targetAmount !== undefined) goal.targetAmount = Math.max(Number(targetAmount), 1);
        if (deadline !== undefined) goal.deadline = new Date(deadline);
        if (category !== undefined) goal.category = category.trim();
        if (color !== undefined) goal.color = color;
        if (status && ['in-progress', 'completed'].includes(status)) goal.status = status;

        const updated = await goal.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteGoal = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        if (goal.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await goal.deleteOne();
        res.json({ message: 'Goal removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const contributeToGoal = async (req, res) => {
    const { amount } = req.body;
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount === 0) {
        return res.status(400).json({ message: 'Please enter a valid deposit or withdrawal amount' });
    }

    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        if (goal.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        goal.currentAmount = Math.max(0, goal.currentAmount + numericAmount);
        if (goal.currentAmount >= goal.targetAmount) {
            goal.status = 'completed';
        } else {
            goal.status = 'in-progress';
        }

        const saved = await goal.save();
        res.json(saved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGoalForecast = async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);
        if (!goal) return res.status(404).json({ message: 'Goal not found' });
        if (goal.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Fetch transactions from the last 60 days to compute monthly savings rate
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const txs = await Transaction.find({
            userId: req.user,
            date: { $gte: sixtyDaysAgo }
        });

        const totalIncome = txs.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
        const totalExpense = txs.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
        const netSavings60Days = totalIncome - totalExpense;
        const avgMonthlySavings = Math.max(netSavings60Days / 2, 0);

        const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
        const now = new Date();
        const deadlineDate = new Date(goal.deadline);
        const monthsUntilDeadline = Math.max((deadlineDate - now) / (1000 * 60 * 60 * 24 * 30), 0.5);
        const monthlyNeeded = (remaining / monthsUntilDeadline).toFixed(0);

        // Try OpenAI for a smart recommendation
        let aiRecommendation = null;
        const openai = getOpenAIClient();
        if (openai && remaining > 0) {
            try {
                const prompt = `Goal: "${goal.title}"
Target: ₹${goal.targetAmount}
Currently Saved: ₹${goal.currentAmount}
Remaining Needed: ₹${remaining}
Deadline: ${deadlineDate.toISOString().split('T')[0]} (${monthsUntilDeadline.toFixed(1)} months away)
User's Avg Monthly Net Savings: ₹${avgMonthlySavings.toFixed(0)}
Required Monthly Contribution: ₹${monthlyNeeded}

Provide a 2-sentence encouraging and practical assessment: Will the user reach this goal on time? If not, what concrete spending habit could they adjust to make it?`;

                const completion = await openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are a supportive, mathematically accurate personal finance coach.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 180,
                    temperature: 0.7
                });

                aiRecommendation = completion.choices?.[0]?.message?.content?.trim();
            } catch (err) {
                console.error('AI Forecast error:', err.message);
            }
        }

        if (!aiRecommendation) {
            if (remaining === 0) {
                aiRecommendation = `Congratulations! You have reached 100% of your target for "${goal.title}"!`;
            } else if (avgMonthlySavings >= Number(monthlyNeeded)) {
                aiRecommendation = `You're on track! Saving ₹${monthlyNeeded}/month will comfortably hit your target by ${deadlineDate.toLocaleDateString()}.`;
            } else {
                aiRecommendation = `To meet your deadline by ${deadlineDate.toLocaleDateString()}, you need to deposit approx ₹${monthlyNeeded}/month (current avg savings is ₹${avgMonthlySavings.toFixed(0)}/mo).`;
            }
        }

        return res.json({
            remaining,
            avgMonthlySavings: Math.round(avgMonthlySavings),
            monthlyNeeded: Number(monthlyNeeded),
            monthsUntilDeadline: Number(monthsUntilDeadline.toFixed(1)),
            isOnTrack: avgMonthlySavings >= Number(monthlyNeeded),
            recommendation: aiRecommendation
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    getGoalForecast
};
