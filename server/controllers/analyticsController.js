const Transaction = require('../models/Transaction');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/analytics/studio
const getAnalyticsStudio = async (req, res) => {
    try {
        const range = req.query.range || '6m'; // '1m' | '3m' | '6m' | '1y' | 'all'
        const now = new Date();
        let startDate = null;

        if (range === '1m') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (range === '3m') {
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (range === '6m') {
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        } else if (range === '1y') {
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        }

        const query = { userId: req.user };
        if (startDate) {
            query.date = { $gte: startDate };
        }

        const transactions = await Transaction.find(query).sort({ date: 1 });

        // 1. Overall Totals
        let totalIncome = 0;
        let totalExpense = 0;
        const dayExpensesMap = {}; // 'YYYY-MM-DD' -> expense sum
        const dayOfWeekExpenses = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
        const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
        const categoryMap = {};

        transactions.forEach(t => {
            const amt = Number(t.amount) || 0;
            const tDate = new Date(t.date);
            const dateStr = tDate.toISOString().split('T')[0];
            const dayOfWeek = tDate.getDay();

            if (t.type === 'income') {
                totalIncome += amt;
            } else if (t.type === 'expense') {
                totalExpense += amt;
                dayExpensesMap[dateStr] = (dayExpensesMap[dateStr] || 0) + amt;
                dayOfWeekExpenses[dayOfWeek] += amt;
                dayOfWeekCounts[dayOfWeek] += 1;

                const cat = t.category || 'General';
                if (!categoryMap[cat]) {
                    categoryMap[cat] = { amount: 0, count: 0 };
                }
                categoryMap[cat].amount += amt;
                categoryMap[cat].count += 1;
            }
        });

        // 2. Timeline Aggregation (Daily for 1m, Monthly for others)
        const timelineMap = {};
        const isDaily = range === '1m';

        transactions.forEach(t => {
            const d = new Date(t.date);
            let key;
            let displayLabel;

            if (isDaily) {
                key = d.toISOString().split('T')[0];
                displayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                key = `${year}-${month}`;
                displayLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }

            if (!timelineMap[key]) {
                timelineMap[key] = {
                    key,
                    label: displayLabel,
                    income: 0,
                    expense: 0,
                    net: 0
                };
            }

            const amt = Number(t.amount) || 0;
            if (t.type === 'income') {
                timelineMap[key].income += amt;
            } else if (t.type === 'expense') {
                timelineMap[key].expense += amt;
            }
            timelineMap[key].net = timelineMap[key].income - timelineMap[key].expense;
        });

        // Sort timeline chronologically and add running cumulative balance
        const sortedTimeline = Object.keys(timelineMap)
            .sort()
            .map(k => timelineMap[k]);

        let runningNet = 0;
        const timelineData = sortedTimeline.map(item => {
            runningNet += item.net;
            const savingsRate = item.income > 0 
                ? Math.round(((item.income - item.expense) / item.income) * 100) 
                : 0;
            return {
                ...item,
                income: Math.round(item.income * 100) / 100,
                expense: Math.round(item.expense * 100) / 100,
                net: Math.round(item.net * 100) / 100,
                cumulativeNet: Math.round(runningNet * 100) / 100,
                savingsRate
            };
        });

        // 3. Day of Week Breakdown
        const dayOfWeekData = DAY_NAMES.map((name, idx) => ({
            day: name,
            shortDay: name.slice(0, 3),
            totalExpense: Math.round(dayOfWeekExpenses[idx] * 100) / 100,
            avgExpense: dayOfWeekCounts[idx] > 0 
                ? Math.round((dayOfWeekExpenses[idx] / dayOfWeekCounts[idx]) * 100) / 100 
                : 0,
            transactionCount: dayOfWeekCounts[idx]
        }));

        // 4. Category Breakdown
        const categoryData = Object.keys(categoryMap).map(cat => ({
            name: cat,
            amount: Math.round(categoryMap[cat].amount * 100) / 100,
            count: categoryMap[cat].count,
            percentage: totalExpense > 0 
                ? Math.round((categoryMap[cat].amount / totalExpense) * 1000) / 10 
                : 0
        })).sort((a, b) => b.amount - a.amount);

        // 5. KPIs
        let daysInRange = 30;
        if (range === '3m') daysInRange = 90;
        if (range === '6m') daysInRange = 180;
        if (range === '1y') daysInRange = 365;
        if (range === 'all' && transactions.length > 0) {
            const firstDate = new Date(transactions[0].date);
            const diffDays = Math.max(Math.ceil((now - firstDate) / (1000 * 60 * 60 * 24)), 1);
            daysInRange = diffDays;
        }

        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 
            ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) 
            : 0;
        const dailyBurnRate = Math.round((totalExpense / daysInRange) * 100) / 100;
        const incomeToExpenseRatio = totalExpense > 0 
            ? (totalIncome / totalExpense).toFixed(2) 
            : (totalIncome > 0 ? '∞' : '0.00');

        // Peak day
        let peakDay = null;
        let peakDayAmount = 0;
        for (const [dStr, amt] of Object.entries(dayExpensesMap)) {
            if (amt > peakDayAmount) {
                peakDayAmount = amt;
                peakDay = dStr;
            }
        }

        res.json({
            range,
            kpis: {
                totalIncome: Math.round(totalIncome * 100) / 100,
                totalExpense: Math.round(totalExpense * 100) / 100,
                netSavings: Math.round(netSavings * 100) / 100,
                savingsRate,
                dailyBurnRate,
                incomeToExpenseRatio,
                transactionCount: transactions.length,
                topCategory: categoryData.length > 0 ? categoryData[0].name : 'None',
                topCategoryAmount: categoryData.length > 0 ? categoryData[0].amount : 0,
                peakDay: peakDay ? new Date(peakDay).toLocaleDateString() : 'N/A',
                peakDayAmount: Math.round(peakDayAmount * 100) / 100
            },
            timelineData,
            dayOfWeekData,
            categoryData,
            recentTransactions: transactions.slice(-10).reverse()
        });
    } catch (error) {
        console.error('Analytics studio error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAnalyticsStudio
};
