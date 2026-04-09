const Transaction = require('../models/Transaction');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const getInsights = async (req, res) => {
    try {
        // Fetch user transactions
        const transactions = await Transaction.find({ userId: req.user });
        
        const summary = transactions.map(t => 
            `${t.date.toISOString().split('T')[0]}: ${t.type} of ${t.amount} for ${t.category} (${t.notes || ''})`
        ).join('\n');

        let prompt = `Analyze the following transaction history and provide brief financial insights.\nIdentify overspending, suggest savings, and give budget improvement tips. Please keep it under 3 short paragraphs.\nNote: All values are in Indian Rupees (INR).\nTransactions:\n${summary}`;

        if (!transactions.length) {
            return res.json({ insight: "You don't have any transactions yet. Start adding your income and expenses to get AI-powered insights!" });
        }

        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                return res.json({ insight: text });
            } catch (aiError) {
                console.error("Gemini API Error:", aiError);
                // Fallback implemented below
            }
        }

        // Fallback rule-based insight
        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + curr.amount, 0);

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + curr.amount, 0);

        let fallbackMsg = `You have spent ₹${totalExpense} out of your ₹${totalIncome} income. `;
        if (totalExpense > totalIncome) {
            fallbackMsg += 'You are overspending this month! Try cutting back on non-essentials.';
        } else if (totalExpense > totalIncome * 0.8) {
            fallbackMsg += 'You are nearing your income limit. Keep an eye on your expenses.';
        } else {
            fallbackMsg += 'You are doing great! Keep saving.';
        }

        return res.json({ insight: fallbackMsg });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getInsights };
