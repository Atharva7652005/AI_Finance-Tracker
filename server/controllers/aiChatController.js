const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const getOpenAIClient = require('../config/openai');

const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_financial_summary',
            description: 'Get financial totals (income, expense, balance, and category breakdown) for a specified timeframe.',
            parameters: {
                type: 'object',
                properties: {
                    period: {
                        type: 'string',
                        enum: ['this_month', 'last_month', 'all_time'],
                        description: 'The timeframe for financial calculation'
                    },
                    category: {
                        type: 'string',
                        description: 'Optional category name to filter by (e.g. Food, Rent, Salary)'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_budget_status',
            description: 'Get the user’s monthly budget limit, amount spent so far this month, and remaining budget.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_transaction',
            description: 'Log a new income or expense transaction when the user requests to record or save an expense/income.',
            parameters: {
                type: 'object',
                properties: {
                    amount: { type: 'number', description: 'Amount in INR (must be positive)' },
                    type: { type: 'string', enum: ['income', 'expense'], description: 'Whether this is income or an expense' },
                    category: { type: 'string', description: 'Category name (e.g. Food & Dining, Salary, Groceries, Rent, Transportation)' },
                    notes: { type: 'string', description: 'Optional short notes describing the transaction' }
                },
                required: ['amount', 'type', 'category']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_recent_transactions',
            description: 'Fetch the most recent transactions recorded by the user.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'number', description: 'Number of transactions to fetch (default 5, max 15)' }
                }
            }
        }
    }
];

// Helper to execute tool calls
const executeTool = async (name, args, userId) => {
    if (name === 'get_financial_summary') {
        const period = args.period || 'this_month';
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const query = { userId };
        if (period === 'this_month') {
            const start = new Date(currentYear, currentMonth, 1);
            const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
            query.date = { $gte: start, $lte: end };
        } else if (period === 'last_month') {
            const start = new Date(currentYear, currentMonth - 1, 1);
            const end = new Date(currentYear, currentMonth, 0, 23, 59, 59);
            query.date = { $gte: start, $lte: end };
        }

        if (args.category) {
            query.category = new RegExp(args.category.trim(), 'i');
        }

        const txs = await Transaction.find(query);
        const income = txs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = txs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

        const categoryBreakdown = {};
        txs.forEach(t => {
            if (t.type === 'expense') {
                categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
            }
        });

        return {
            period,
            totalIncome: income,
            totalExpense: expense,
            netBalance: income - expense,
            transactionCount: txs.length,
            topExpenseCategories: categoryBreakdown
        };
    }

    if (name === 'get_budget_status') {
        const budgetDoc = await Budget.findOne({ userId });
        const monthlyLimit = budgetDoc?.monthlyLimit || 0;

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const expenses = await Transaction.find({
            userId,
            type: 'expense',
            date: { $gte: start, $lte: end }
        });

        const totalSpentThisMonth = expenses.reduce((acc, t) => acc + t.amount, 0);
        const remaining = monthlyLimit > 0 ? monthlyLimit - totalSpentThisMonth : 0;
        const isOverBudget = monthlyLimit > 0 && totalSpentThisMonth > monthlyLimit;

        return {
            monthlyLimit,
            totalSpentThisMonth,
            remainingBudget: remaining,
            isOverBudget,
            percentageUsed: monthlyLimit > 0 ? ((totalSpentThisMonth / monthlyLimit) * 100).toFixed(1) : 0
        };
    }

    if (name === 'create_transaction') {
        const amount = Math.abs(Number(args.amount));
        if (!amount || isNaN(amount)) {
            return { error: 'Invalid amount.' };
        }

        const newTx = await Transaction.create({
            userId,
            amount,
            type: args.type,
            category: args.category.trim(),
            notes: (args.notes || '').trim(),
            date: new Date()
        });

        return {
            success: true,
            transactionId: newTx._id,
            amount: newTx.amount,
            type: newTx.type,
            category: newTx.category,
            notes: newTx.notes,
            date: newTx.date.toISOString().split('T')[0]
        };
    }

    if (name === 'get_recent_transactions') {
        const limit = Math.min(Math.max(Number(args.limit) || 5, 1), 15);
        const txs = await Transaction.find({ userId }).sort({ date: -1 }).limit(limit);
        return {
            recentTransactions: txs.map(t => ({
                id: t._id,
                date: t.date.toISOString().split('T')[0],
                type: t.type,
                amount: t.amount,
                category: t.category,
                notes: t.notes
            }))
        };
    }

    return { error: 'Unknown function' };
};

const handleAIChat = async (req, res) => {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message cannot be empty.' });
    }

    const openai = getOpenAIClient();
    if (!openai) {
        return res.json({
            reply: 'AI Assistant is currently offline because the OpenAI API key is not configured. Please check your server environment settings.'
        });
    }

    try {
        const systemPrompt = [
            'You are "FinAI", an intelligent, proactive, and empathetic personal financial assistant built into the AI Finance Tracker.',
            'You help the user understand their spending, maintain budgets, set savings goals, and manage their finances.',
            'All amounts are in Indian Rupees (INR, ₹). Use ₹ symbol when quoting amounts.',
            'Always provide accurate data by calling your available tools whenever the user asks about their finances or asks to log a transaction.',
            'If the user tells you they bought something or earned money (e.g. "I spent ₹300 on lunch"), call the `create_transaction` tool immediately to log it.',
            'Keep replies concise, friendly, and well-formatted with markdown.'
        ].join(' ');

        const messages = [{ role: 'system', content: systemPrompt }];

        if (Array.isArray(history)) {
            history.slice(-8).forEach(item => {
                if (item && (item.role === 'user' || item.role === 'assistant') && item.content) {
                    messages.push({ role: item.role, content: item.content });
                }
            });
        }

        messages.push({ role: 'user', content: message.trim() });

        // Initial completion with tools enabled
        const firstResponse = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages,
            tools: TOOLS,
            tool_choice: 'auto',
            temperature: 0.7
        });

        const responseMessage = firstResponse.choices?.[0]?.message;

        // If model decided to call tools
        if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
            messages.push(responseMessage);
            let actionRecord = null;

            for (const toolCall of responseMessage.tool_calls) {
                const fnName = toolCall.function.name;
                let fnArgs = {};
                try {
                    fnArgs = JSON.parse(toolCall.function.arguments);
                } catch {
                    fnArgs = {};
                }

                const toolResult = await executeTool(fnName, fnArgs, req.user);
                if (fnName === 'create_transaction' && toolResult.success) {
                    actionRecord = { type: 'transaction_created', data: toolResult };
                }

                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult)
                });
            }

            // Second completion to generate natural answer with tool results
            const secondResponse = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages,
                temperature: 0.7
            });

            const finalReply = secondResponse.choices?.[0]?.message?.content || 'I completed that for you!';
            return res.json({
                reply: finalReply,
                actionExecuted: actionRecord
            });
        }

        return res.json({
            reply: responseMessage?.content || 'How can I assist you with your finances today?'
        });
    } catch (error) {
        console.error('AI Chat Error:', error);
        return res.status(500).json({
            message: 'Unable to process chat request at this moment.',
            error: error.message
        });
    }
};

module.exports = { handleAIChat };
