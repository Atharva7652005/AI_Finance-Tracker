const Group = require('../models/Group');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Helper to compute net balances and simplified debts
const computeGroupFinances = (group) => {
    const netBalances = {};
    const members = group.members || [];

    // Initialize all members with 0
    members.forEach(m => {
        netBalances[m.name] = 0;
    });

    // Process expenses
    (group.expenses || []).forEach(exp => {
        if (!netBalances[exp.paidBy]) netBalances[exp.paidBy] = 0;
        netBalances[exp.paidBy] += Number(exp.amount) || 0;

        (exp.splits || []).forEach(split => {
            if (!netBalances[split.memberName]) netBalances[split.memberName] = 0;
            netBalances[split.memberName] -= Number(split.amountOwed) || 0;
        });
    });

    // Process settlements
    (group.settlements || []).forEach(st => {
        if (!netBalances[st.from]) netBalances[st.from] = 0;
        if (!netBalances[st.to]) netBalances[st.to] = 0;
        netBalances[st.from] += Number(st.amount) || 0;
        netBalances[st.to] -= Number(st.amount) || 0;
    });

    // Build UPI map
    const upiMap = {};
    members.forEach(m => {
        if (m.upiId) upiMap[m.name] = m.upiId;
    });

    // Separate into debtors and creditors
    const debtors = [];
    const creditors = [];

    for (const [name, rawBalance] of Object.entries(netBalances)) {
        const rounded = Math.round(rawBalance * 100) / 100;
        if (rounded < -0.01) {
            debtors.push({ name, amount: -rounded });
        } else if (rounded > 0.01) {
            creditors.push({ name, amount: rounded });
        }
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const simplifiedDebts = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
        const debtor = debtors[d];
        const creditor = creditors[c];

        const settlementAmount = Math.min(debtor.amount, creditor.amount);
        const roundedSettlement = Math.round(settlementAmount * 100) / 100;

        if (roundedSettlement > 0) {
            simplifiedDebts.push({
                from: debtor.name,
                to: creditor.name,
                amount: roundedSettlement,
                toUpiId: upiMap[creditor.name] || ''
            });
        }

        debtor.amount -= settlementAmount;
        creditor.amount -= settlementAmount;

        if (debtor.amount < 0.01) d++;
        if (creditor.amount < 0.01) c++;
    }

    // Category breakdown
    const categoryTotals = {};
    let totalExpense = 0;
    (group.expenses || []).forEach(exp => {
        const cat = exp.category || 'General';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(exp.amount) || 0);
        totalExpense += Number(exp.amount) || 0;
    });

    const categoryBreakdown = Object.keys(categoryTotals).map(cat => ({
        name: cat,
        value: categoryTotals[cat]
    }));

    // Member spend contribution (who paid what)
    const paidByTotals = {};
    (group.expenses || []).forEach(exp => {
        paidByTotals[exp.paidBy] = (paidByTotals[exp.paidBy] || 0) + (Number(exp.amount) || 0);
    });

    const payerBreakdown = Object.keys(paidByTotals).map(p => ({
        name: p,
        amount: paidByTotals[p]
    }));

    return {
        netBalances,
        simplifiedDebts,
        totalExpense,
        categoryBreakdown,
        payerBreakdown
    };
};

// GET /api/groups
const getGroups = async (req, res) => {
    try {
        const groups = await Group.find({ userId: req.user }).sort({ updatedAt: -1 });

        const enrichedGroups = groups.map(g => {
            const finances = computeGroupFinances(g);
            const currentUserMember = g.members.find(m => m.isCurrentUser);
            const currentUserName = currentUserMember ? currentUserMember.name : null;
            const myBalance = currentUserName && finances.netBalances[currentUserName] !== undefined
                ? Math.round(finances.netBalances[currentUserName] * 100) / 100
                : 0;

            return {
                _id: g._id,
                name: g.name,
                category: g.category,
                description: g.description,
                currency: g.currency,
                membersCount: g.members.length,
                expenseCount: g.expenses.length,
                totalExpense: finances.totalExpense,
                myBalance,
                updatedAt: g.updatedAt
            };
        });

        res.json(enrichedGroups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/groups/:id
const getGroupById = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, userId: req.user });
        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const finances = computeGroupFinances(group);

        res.json({
            group,
            ...finances
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/groups
const createGroup = async (req, res) => {
    const { name, category, description, currency, members } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        // Fetch current user details
        const currentUser = await User.findById(req.user);
        const currentUserName = currentUser ? currentUser.name : 'You';
        const currentUserEmail = currentUser ? currentUser.email : '';

        // Format members list
        let formattedMembers = [];
        let hasCurrentUser = false;

        if (Array.isArray(members) && members.length > 0) {
            formattedMembers = members
                .filter(m => m && m.name && m.name.trim())
                .map(m => {
                    const isMe = m.isCurrentUser || m.name.trim().toLowerCase() === currentUserName.toLowerCase();
                    if (isMe) hasCurrentUser = true;
                    return {
                        name: m.name.trim(),
                        email: m.email ? m.email.trim() : '',
                        upiId: m.upiId ? m.upiId.trim() : '',
                        isCurrentUser: isMe
                    };
                });
        }

        // If current user is not in the list, prepend them
        if (!hasCurrentUser) {
            formattedMembers.unshift({
                name: currentUserName,
                email: currentUserEmail,
                upiId: '',
                isCurrentUser: true
            });
        }

        const newGroup = await Group.create({
            userId: req.user,
            name: name.trim(),
            category: category || 'Trip',
            description: description ? description.trim() : '',
            currency: currency || 'INR',
            members: formattedMembers,
            expenses: [],
            settlements: []
        });

        res.status(201).json(newGroup);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/groups/:id
const updateGroup = async (req, res) => {
    const { name, category, description, currency, members } = req.body;
    try {
        const group = await Group.findOne({ _id: req.params.id, userId: req.user });
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (name && name.trim()) group.name = name.trim();
        if (category) group.category = category;
        if (description !== undefined) group.description = description.trim();
        if (currency) group.currency = currency;
        if (Array.isArray(members) && members.length > 0) {
            group.members = members;
        }

        await group.save();
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/groups/:id
const deleteGroup = async (req, res) => {
    try {
        const group = await Group.findOneAndDelete({ _id: req.params.id, userId: req.user });
        if (!group) return res.status(404).json({ message: 'Group not found' });
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/groups/:id/expenses
const addExpense = async (req, res) => {
    const { description, amount, paidBy, category, splitType, splits, notes, date } = req.body;

    if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Expense description is required' });
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    if (!paidBy || !paidBy.trim()) {
        return res.status(400).json({ message: 'Payer must be specified' });
    }

    try {
        const group = await Group.findOne({ _id: req.params.id, userId: req.user });
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const memberNames = group.members.map(m => m.name);
        let finalSplits = [];

        if (splitType === 'exact' && Array.isArray(splits) && splits.length > 0) {
            finalSplits = splits.map(s => ({
                memberName: s.memberName,
                amountOwed: Number(s.amountOwed) || 0
            }));
        } else if (splitType === 'percentage' && Array.isArray(splits) && splits.length > 0) {
            finalSplits = splits.map(s => ({
                memberName: s.memberName,
                amountOwed: Math.round(((Number(s.percentage) || 0) / 100) * numericAmount * 100) / 100
            }));
        } else {
            // Default: Equal split among specified members or all members
            const targetMembers = (Array.isArray(splits) && splits.length > 0)
                ? splits.map(s => s.memberName)
                : memberNames;
            
            const count = Math.max(targetMembers.length, 1);
            const share = Math.round((numericAmount / count) * 100) / 100;
            let remainder = Math.round((numericAmount - (share * count)) * 100) / 100;

            finalSplits = targetMembers.map((m, idx) => {
                const adjShare = idx === 0 ? share + remainder : share;
                return {
                    memberName: m,
                    amountOwed: Math.round(adjShare * 100) / 100
                };
            });
        }

        const newExpense = {
            description: description.trim(),
            amount: numericAmount,
            paidBy: paidBy.trim(),
            category: category || 'General',
            splitType: splitType || 'equal',
            splits: finalSplits,
            date: date ? new Date(date) : new Date(),
            notes: notes ? notes.trim() : '',
            syncedToPersonal: false
        };

        group.expenses.push(newExpense);
        await group.save();

        const finances = computeGroupFinances(group);
        res.status(201).json({ group, ...finances });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/groups/:id/expenses/:expenseId
const deleteExpense = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, userId: req.user });
        if (!group) return res.status(404).json({ message: 'Group not found' });

        group.expenses = group.expenses.filter(e => e._id.toString() !== req.params.expenseId);
        await group.save();

        const finances = computeGroupFinances(group);
        res.json({ group, ...finances });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/groups/:id/settle
const recordSettlement = async (req, res) => {
    const { from, to, amount, notes } = req.body;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({ message: 'Settlement amount must be greater than 0' });
    }

    if (!from || !to) {
        return res.status(400).json({ message: 'Both sender and receiver are required' });
    }

    try {
        const group = await Group.findOne({ _id: req.params.id, userId: req.user });
        if (!group) return res.status(404).json({ message: 'Group not found' });

        group.settlements.push({
            from: from.trim(),
            to: to.trim(),
            amount: numericAmount,
            notes: notes ? notes.trim() : 'Settled via Split Expenses',
            date: new Date()
        });

        await group.save();
        const finances = computeGroupFinances(group);
        res.json({ group, ...finances });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/groups/:id/expenses/:expenseId/sync-personal
const syncExpenseToPersonal = async (req, res) => {
    try {
        const group = await Group.findOne({ _id: req.params.id, userId: req.user });
        if (!group) return res.status(404).json({ message: 'Group not found' });

        const expense = group.expenses.id(req.params.expenseId);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        if (expense.syncedToPersonal) {
            return res.status(400).json({ message: 'This expense share has already been synced to your personal transactions' });
        }

        // Find current user's name
        const currentUserMember = group.members.find(m => m.isCurrentUser);
        const currentUserName = currentUserMember ? currentUserMember.name : null;

        // Find user's split share
        const mySplit = expense.splits.find(s => s.memberName === currentUserName);
        const amountToSync = mySplit ? mySplit.amountOwed : expense.amount;

        if (amountToSync <= 0) {
            return res.status(400).json({ message: 'Your share for this expense is ₹0, nothing to sync' });
        }

        // Create transaction in user's personal ledger
        const transaction = await Transaction.create({
            userId: req.user,
            amount: amountToSync,
            type: 'expense',
            category: expense.category || 'Shared Expense',
            date: expense.date || new Date(),
            notes: `[Split: ${group.name}] ${expense.description} (Paid by ${expense.paidBy})`
        });

        expense.syncedToPersonal = true;
        await group.save();

        res.json({
            message: 'Expense share synced successfully to personal transactions!',
            transaction,
            expense
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getGroups,
    getGroupById,
    createGroup,
    updateGroup,
    deleteGroup,
    addExpense,
    deleteExpense,
    recordSettlement,
    syncExpenseToPersonal
};
