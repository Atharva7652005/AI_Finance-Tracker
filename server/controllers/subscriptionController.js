const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');

const getSubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ userId: req.user }).sort({ nextBillingDate: 1 });
        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createSubscription = async (req, res) => {
    const { name, amount, billingCycle, nextBillingDate, category, reminderEnabled, notes } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Subscription name is required' });
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    if (!nextBillingDate) {
        return res.status(400).json({ message: 'Next billing date is required' });
    }

    try {
        const subscription = await Subscription.create({
            userId: req.user,
            name: name.trim(),
            amount: numericAmount,
            billingCycle: billingCycle || 'monthly',
            nextBillingDate: new Date(nextBillingDate),
            category: category || 'Entertainment',
            reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
            notes: (notes || '').trim()
        });

        res.status(201).json(subscription);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
        if (subscription.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { name, amount, billingCycle, nextBillingDate, category, reminderEnabled, notes } = req.body;
        if (name !== undefined) subscription.name = name.trim();
        if (amount !== undefined) subscription.amount = Math.max(Number(amount), 1);
        if (billingCycle !== undefined) subscription.billingCycle = billingCycle;
        if (nextBillingDate !== undefined) subscription.nextBillingDate = new Date(nextBillingDate);
        if (category !== undefined) subscription.category = category;
        if (reminderEnabled !== undefined) subscription.reminderEnabled = reminderEnabled;
        if (notes !== undefined) subscription.notes = notes.trim();

        const updated = await subscription.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) return res.status(404).json({ message: 'Subscription not found' });
        if (subscription.userId.toString() !== req.user.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await subscription.deleteOne();
        res.json({ message: 'Subscription removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUpcomingBills = async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const upcoming = await Subscription.find({
            userId: req.user,
            nextBillingDate: { $gte: now, $lte: thirtyDaysOut }
        }).sort({ nextBillingDate: 1 });

        const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const dueIn7Days = upcoming.filter(s => new Date(s.nextBillingDate) <= sevenDaysOut);

        const totalDueIn7Days = dueIn7Days.reduce((acc, s) => acc + s.amount, 0);
        const totalDueIn30Days = upcoming.reduce((acc, s) => acc + s.amount, 0);

        res.json({
            upcoming,
            dueIn7Days,
            totalDueIn7Days,
            totalDueIn30Days
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const detectSubscriptions = async (req, res) => {
    try {
        // Fetch all expense transactions for the user
        const expenses = await Transaction.find({
            userId: req.user,
            type: 'expense'
        }).sort({ date: -1 });

        // Existing subscriptions
        const existingSubs = await Subscription.find({ userId: req.user });
        const existingNames = new Set(existingSubs.map(s => s.name.toLowerCase()));

        // Group expenses by (category + rounded amount) or notes
        const patternMap = {};
        expenses.forEach(t => {
            const key = (t.notes ? t.notes.toLowerCase().trim() : t.category.toLowerCase().trim()) + '_' + t.amount;
            if (!patternMap[key]) {
                patternMap[key] = {
                    name: t.notes ? t.notes.trim() : t.category,
                    amount: t.amount,
                    category: t.category,
                    dates: []
                };
            }
            patternMap[key].dates.push(new Date(t.date));
        });

        // Filter patterns that occurred 2 or more times
        const detected = [];
        Object.values(patternMap).forEach(pattern => {
            if (pattern.dates.length >= 2 && !existingNames.has(pattern.name.toLowerCase())) {
                const latestDate = new Date(Math.max(...pattern.dates));
                // Estimate next billing date 1 month from latest
                const nextEstimated = new Date(latestDate);
                nextEstimated.setMonth(nextEstimated.getMonth() + 1);

                detected.push({
                    name: pattern.name,
                    amount: pattern.amount,
                    category: pattern.category,
                    occurrences: pattern.dates.length,
                    estimatedNextDate: nextEstimated.toISOString().split('T')[0]
                });
            }
        });

        res.json(detected.slice(0, 6)); // Return up to top 6 candidates
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSubscriptions,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    getUpcomingBills,
    detectSubscriptions
};
