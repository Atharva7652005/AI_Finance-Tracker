import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/format';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const Reports = () => {
    const [transactions, setTransactions] = useState([]);
    const [budget, setBudget] = useState(0);
    const [budgetInput, setBudgetInput] = useState('');

    useEffect(() => {
        const fetchAll = async () => {
            const [tRes, bRes] = await Promise.all([
                axios.get('/api/transactions'),
                axios.get('/api/budget')
            ]);
            setTransactions(tRes.data);
            setBudget(bRes.data.monthlyLimit);
            setBudgetInput(bRes.data.monthlyLimit || '');
        };
        fetchAll();
    }, []);

    const handleSaveBudget = async () => {
        const { data } = await axios.post('/api/budget', { monthlyLimit: Number(budgetInput) });
        setBudget(data.monthlyLimit);
        alert('Budget updated');
    };

    // Prepare pie chart for expenses by category
    const expenseData = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        if (!expenseData[t.category]) expenseData[t.category] = 0;
        expenseData[t.category] += t.amount;
    });

    const pieData = Object.keys(expenseData).map(key => ({
        name: key, value: expenseData[key]
    }));

    return (
        <div className="animate-fade-in delay-3">
            <h1>Reports & Budget</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Analyze your spending visually</p>

            <div className="grid-2">
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3>Expense by Category</h3>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={60} outerRadius={100} 
                                    paddingAngle={5} dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{ background: '#13131c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>No expenses to display.</p>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3>Set Monthly Budget</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '10px', marginBottom: '20px' }}>
                        Set a spending limit to receive alerts when you overview.
                    </p>
                    <div className="form-group">
                        <label className="form-label">Monthly Limit</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>₹</span>
                            <input 
                                type="number" className="form-input" style={{ paddingLeft: '30px' }}
                                value={budgetInput} 
                                onChange={e => setBudgetInput(e.target.value)} 
                                placeholder="Enter amount in ₹"
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveBudget}>Save Budget</button>

                    <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <h4>Current Limit: <span className="text-accent">{formatCurrency(budget)}</span></h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
