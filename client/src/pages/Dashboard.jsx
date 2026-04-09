import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, BrainCircuit } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [transactions, setTransactions] = useState([]);
    const [budget, setBudget] = useState(0);
    const [insight, setInsight] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [txRes, bRes] = await Promise.all([
                    axios.get('/api/transactions'),
                    axios.get('/api/budget')
                ]);
                setTransactions(txRes.data);
                setBudget(bRes.data.monthlyLimit);
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    const fetchInsights = async () => {
        setLoadingAI(true);
        try {
            const res = await axios.get('/api/ai-insights');
            setInsight(res.data.insight);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingAI(false);
        }
    };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Prepare chart data (group by date)
    const chartDataMap = {};
    transactions.forEach(t => {
        const dateStr = new Date(t.date).toLocaleDateString();
        if(!chartDataMap[dateStr]) chartDataMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
        chartDataMap[dateStr][t.type] += t.amount;
    });
    const chartData = Object.values(chartDataMap).slice(0, 7).reverse(); // last 7 days

    return (
        <div className="animate-fade-in delay-1">
            <div className="flex-between" style={{ marginBottom: '30px' }}>
                <div>
                    <h1>Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.name}</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid-3" style={{ marginBottom: '30px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Balance</p>
                            <h2>{formatCurrency(balance)}</h2>
                        </div>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <Wallet className="text-accent" size={24} color="var(--accent-color)" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Income</p>
                            <h2>{formatCurrency(totalIncome)}</h2>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <ArrowUpRight className="text-green" size={24} />
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Expense</p>
                            <h2 className={budget > 0 && totalExpense > budget ? 'text-red' : ''}>
                                {formatCurrency(totalExpense)}
                            </h2>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <ArrowDownRight className="text-red" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {budget > 0 && totalExpense > budget && (
                <div className="glass-panel" style={{
                    padding: '16px 24px', marginBottom: '30px', 
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)'
                }}>
                    <strong className="text-red">Alert!</strong> You have exceeded your monthly budget of {formatCurrency(budget)}.
                </div>
            )}

            <div className="grid-2">
                <div className="glass-panel" style={{ padding: '24px', minHeight: '350px' }}>
                    <h3 style={{ marginBottom: '20px' }}>Cash Flow (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis dataKey="date" stroke="#9da3ad" />
                            <YAxis stroke="#9da3ad" />
                            <Tooltip 
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ background: '#13131c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="income" fill="var(--success)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BrainCircuit color="var(--accent-color)" /> AI Insights
                        </h3>
                        <button className="btn btn-primary" onClick={fetchInsights} disabled={loadingAI} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                            {loadingAI ? 'Analyzing...' : 'Generate New'}
                        </button>
                    </div>
                    {insight ? (
                        <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                            {insight}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                            <p>Click generate to get personalized AI tips!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
