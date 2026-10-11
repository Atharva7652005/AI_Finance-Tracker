import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '../utils/format';
import { CheckCircle2, AlertCircle } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

const Reports = () => {
    const [transactions, setTransactions] = useState([]);
    const [budget, setBudget] = useState(0);
    const [budgetInput, setBudgetInput] = useState('');
    const [period, setPeriod] = useState('this-month'); // 'this-month' | 'all-time'
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [tRes, bRes] = await Promise.all([
                    api.get('/api/transactions'),
                    api.get('/api/budget')
                ]);
                setTransactions(Array.isArray(tRes.data) ? tRes.data : []);
                const limit = bRes.data?.monthlyLimit || 0;
                setBudget(limit);
                setBudgetInput(limit ? String(limit) : '');
            } catch (err) {
                console.error('Failed to load reports data:', err);
                setStatusMsg({ text: 'Unable to fetch latest report data.', type: 'error' });
            }
        };
        fetchAll();
    }, []);

    const handleSaveBudget = async () => {
        setStatusMsg({ text: '', type: '' });
        const numeric = Number(budgetInput);
        if (isNaN(numeric) || numeric < 0) {
            setStatusMsg({ text: 'Please enter a valid non-negative budget limit.', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const { data } = await api.post('/api/budget', { monthlyLimit: numeric });
            setBudget(data.monthlyLimit);
            setStatusMsg({ text: 'Monthly budget updated successfully!', type: 'success' });
            setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
        } catch (err) {
            console.error('Failed to save budget:', err);
            setStatusMsg({ text: err.response?.data?.message || 'Failed to update budget limit.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Filter transactions based on selected period
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredExpenses = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        if (period === 'this-month') {
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }
        return true;
    });

    const expenseData = {};
    let totalExpenseAmount = 0;
    filteredExpenses.forEach(t => {
        if (!expenseData[t.category]) expenseData[t.category] = 0;
        expenseData[t.category] += t.amount;
        totalExpenseAmount += t.amount;
    });

    const pieData = Object.keys(expenseData).map(key => ({
        name: key,
        value: expenseData[key],
        percentage: totalExpenseAmount > 0 ? ((expenseData[key] / totalExpenseAmount) * 100).toFixed(1) : 0
    }));

    return (
        <div className="animate-fade-in delay-3">
            <div className="flex-between" style={{ marginBottom: '30px' }}>
                <div>
                    <h1>Reports & Budget</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Analyze your spending visually</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        className={`btn ${period === 'this-month' ? 'btn-primary' : ''}`}
                        style={period !== 'this-month' ? { background: 'rgba(255,255,255,0.06)' } : {}}
                        onClick={() => setPeriod('this-month')}
                    >
                        This Month
                    </button>
                    <button 
                        className={`btn ${period === 'all-time' ? 'btn-primary' : ''}`}
                        style={period !== 'all-time' ? { background: 'rgba(255,255,255,0.06)' } : {}}
                        onClick={() => setPeriod('all-time')}
                    >
                        All Time
                    </button>
                </div>
            </div>

            {statusMsg.text && (
                <div className="glass-panel" style={{ 
                    padding: '12px 20px', 
                    marginBottom: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    color: statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {statusMsg.text}
                </div>
            )}

            <div className="grid-2">
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '16px' }}>
                        <h3>Expenses by Category</h3>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Total: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(totalExpenseAmount)}</strong>
                        </span>
                    </div>

                    {pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={260}>
                                <PieChart>
                                    <Pie 
                                        data={pieData} 
                                        cx="50%" cy="50%" 
                                        innerRadius={65} outerRadius={95} 
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '16px' }}>
                                {pieData.map((entry, index) => (
                                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                                        <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{entry.name}</span>
                                        <strong>{entry.percentage}%</strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p style={{ marginTop: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No expenses recorded for {period === 'this-month' ? 'this month' : 'the selected period'}.
                        </p>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3>Set Monthly Budget</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '20px' }}>
                        Set a spending limit to receive alerts when you overspend during the month.
                    </p>
                    <div className="form-group">
                        <label className="form-label">Monthly Spending Limit</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>₹</span>
                            <input 
                                type="number" 
                                min="0"
                                step="100"
                                className="form-input" 
                                style={{ paddingLeft: '30px' }}
                                value={budgetInput} 
                                onChange={e => setBudgetInput(e.target.value)} 
                                placeholder="Enter amount in ₹"
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSaveBudget} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Budget'}
                    </button>

                    <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Monthly Budget</div>
                        <h3 className="text-accent">{formatCurrency(budget)}</h3>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
