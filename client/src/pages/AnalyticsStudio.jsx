import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { 
    TrendingUp, ArrowUpRight, ArrowDownRight, 
    Flame, PieChart as PieIcon, Activity, 
    BarChart3, ShieldCheck, Zap, RefreshCw, AlertCircle
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#ef4444', '#eab308'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(19, 19, 32, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '12px 16px',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)'
            }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>{label}</p>
                {payload.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', fontSize: '0.8rem', marginBottom: '4px' }}>
                        <span style={{ color: p.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' }}></span>
                            {p.name}:
                        </span>
                        <strong style={{ color: '#ffffff' }}>{formatCurrency(p.value)}</strong>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const AnalyticsStudio = () => {
    const [range, setRange] = useState('6m'); // '1m' | '3m' | '6m' | '1y' | 'all'
    const [chartMode, setChartMode] = useState('cashflow'); // 'cashflow' | 'cumulative'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    const fetchAnalytics = async (selectedRange) => {
        try {
            setLoading(true);
            setError('');
            const res = await api.get(`/api/analytics/studio?range=${selectedRange}`);
            setData(res.data);
            if (res.data.categoryData?.length > 0 && !selectedCategory) {
                setSelectedCategory(res.data.categoryData[0].name);
            }
        } catch (err) {
            console.error('Failed to load analytics studio data:', err);
            setError('Unable to load analytics. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics(range);
    }, [range]);

    const kpis = data?.kpis || {};
    const timelineData = data?.timelineData || [];
    const dayOfWeekData = data?.dayOfWeekData || [];
    const categoryData = data?.categoryData || [];

    const activeCatInfo = categoryData.find(c => c.name === selectedCategory) || categoryData[0];

    return (
        <div className="animate-fade-in delay-1" style={{ paddingBottom: '50px' }}>
            {/* Header & Controls */}
            <div className="flex-between" style={{ marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <TrendingUp size={28} color="var(--accent-color)" /> Analytics Studio
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Multi-period cash flow intelligence, velocity analysis, and spending patterns.
                    </p>
                </div>

                {/* Range Pill Selector */}
                <div style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    gap: '4px'
                }}>
                    {[
                        { label: '30D', value: '1m' },
                        { label: '3M', value: '3m' },
                        { label: '6M', value: '6m' },
                        { label: '1Y', value: '1y' },
                        { label: 'All', value: 'all' }
                    ].map(r => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                background: range === r.value ? 'var(--accent-color)' : 'transparent',
                                color: range === r.value ? '#ffffff' : 'var(--text-secondary)',
                                transition: 'var(--transition)'
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="glass-panel" style={{
                    padding: '14px 20px',
                    marginBottom: '24px',
                    color: 'var(--danger)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Top KPI Cards (5 Pillars) */}
            <div className="grid-3" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                {/* 1. Savings Rate */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Savings Rate</span>
                        <div style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: kpis.savingsRate >= 25 ? 'rgba(16, 185, 129, 0.15)' : kpis.savingsRate >= 10 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: kpis.savingsRate >= 25 ? 'var(--success)' : kpis.savingsRate >= 10 ? 'var(--warning)' : 'var(--danger)'
                        }}>
                            {kpis.savingsRate >= 25 ? 'Excellent' : kpis.savingsRate >= 10 ? 'Moderate' : 'Low'}
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 4px 0', color: kpis.savingsRate >= 20 ? 'var(--success)' : '#ffffff' }}>
                        {kpis.savingsRate || 0}%
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Of total income saved</span>
                </div>

                {/* 2. Net Cashflow */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Net Cash Flow</span>
                        <div style={{ background: kpis.netSavings >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', padding: '6px', borderRadius: '8px' }}>
                            {kpis.netSavings >= 0 ? <ArrowUpRight size={18} color="var(--success)" /> : <ArrowDownRight size={18} color="var(--danger)" />}
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 4px 0', color: kpis.netSavings >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {formatCurrency(kpis.netSavings || 0)}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Income minus expenses</span>
                </div>

                {/* 3. Daily Burn Rate */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Daily Burn Rate</span>
                        <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '6px', borderRadius: '8px' }}>
                            <Flame size={18} color="var(--warning)" />
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 4px 0' }}>{formatCurrency(kpis.dailyBurnRate || 0)}</h2>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Average outflow per day</span>
                </div>

                {/* 4. Income Buffer Multiplier */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Income Multiplier</span>
                        <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '6px', borderRadius: '8px' }}>
                            <Zap size={18} color="var(--accent-color)" />
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 4px 0' }}>{kpis.incomeToExpenseRatio || 0}x</h2>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Ratio of Income / Expenses</span>
                </div>

                {/* 5. Top Category */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Top Expense Drain</span>
                        <div style={{ background: 'rgba(236, 72, 153, 0.15)', padding: '6px', borderRadius: '8px' }}>
                            <PieIcon size={18} color="#ec4899" />
                        </div>
                    </div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {kpis.topCategory || 'N/A'}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {formatCurrency(kpis.topCategoryAmount || 0)} spent
                    </span>
                </div>
            </div>

            {/* HERO SECTION: Luminous Interactive Cash Flow Chart */}
            <div className="glass-panel" style={{ padding: '28px', marginBottom: '28px' }}>
                <div className="flex-between" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={20} color="var(--accent-color)" />
                            {chartMode === 'cashflow' ? 'Cash Flow Trajectory (Income vs. Expense)' : 'Cumulative Net Wealth Momentum'}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {chartMode === 'cashflow' 
                                ? 'Compare monthly inflows against spending velocity with smooth area curves.'
                                : 'Cumulative running balance tracking asset growth over time.'}
                        </p>
                    </div>

                    {/* Chart Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '3px',
                        borderRadius: '10px',
                        gap: '4px'
                    }}>
                        <button
                            onClick={() => setChartMode('cashflow')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '7px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: chartMode === 'cashflow' ? 'var(--accent-color)' : 'transparent',
                                color: chartMode === 'cashflow' ? '#ffffff' : '#94a3b8'
                            }}
                        >
                            Inflow vs Outflow
                        </button>
                        <button
                            onClick={() => setChartMode('cumulative')}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '7px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                background: chartMode === 'cumulative' ? 'var(--accent-color)' : 'transparent',
                                color: chartMode === 'cumulative' ? '#ffffff' : '#94a3b8'
                            }}
                        >
                            Cumulative Wealth
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ marginRight: '8px' }} /> Analyzing transaction streams...
                    </div>
                ) : timelineData.length === 0 ? (
                    <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        No transactions found for the selected timeframe.
                    </div>
                ) : (
                    <div style={{ width: '100%', height: 340 }}>
                        <ResponsiveContainer>
                            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                                {chartMode === 'cashflow' ? (
                                    <>
                                        <Area 
                                            type="monotone" 
                                            dataKey="income" 
                                            name="Income" 
                                            stroke="#10b981" 
                                            strokeWidth={2.5} 
                                            fillOpacity={1} 
                                            fill="url(#incomeGradient)" 
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="expense" 
                                            name="Expense" 
                                            stroke="#ef4444" 
                                            strokeWidth={2.5} 
                                            fillOpacity={1} 
                                            fill="url(#expenseGradient)" 
                                        />
                                    </>
                                ) : (
                                    <Area 
                                        type="monotone" 
                                        dataKey="cumulativeNet" 
                                        name="Cumulative Balance" 
                                        stroke="#6366f1" 
                                        strokeWidth={3} 
                                        fillOpacity={1} 
                                        fill="url(#cumulativeGradient)" 
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* SECONDARY ROW: Category Distribution Drill-Down + Day-of-Week Velocity */}
            <div className="grid-2" style={{ marginBottom: '28px' }}>
                {/* 1. Category Distribution & Interactive Drill-down */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Category Spend Breakdown</h3>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Click any category to inspect</span>
                        </div>
                    </div>

                    {categoryData.length === 0 ? (
                        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            No expense data available.
                        </div>
                    ) : (
                        <div>
                            <div style={{ width: '100%', height: 220 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={4}
                                            dataKey="amount"
                                            onClick={(entry) => setSelectedCategory(entry.name)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {categoryData.map((entry, idx) => (
                                                <Cell 
                                                    key={`cell-${idx}`} 
                                                    fill={PALETTE[idx % PALETTE.length]}
                                                    stroke={selectedCategory === entry.name ? '#ffffff' : 'transparent'}
                                                    strokeWidth={selectedCategory === entry.name ? 2 : 0}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value) => formatCurrency(value)}
                                            contentStyle={{ background: '#131320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Active Category Drill-down Card */}
                            {activeCatInfo && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <div className="flex-between" style={{ marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
                                            {activeCatInfo.name}
                                        </span>
                                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                                            {formatCurrency(activeCatInfo.amount)} ({activeCatInfo.percentage}%)
                                        </span>
                                    </div>
                                    <div className="flex-between" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <span>Total Purchases: <strong>{activeCatInfo.count} transactions</strong></span>
                                        <span>Avg per Purchase: <strong>{formatCurrency(activeCatInfo.amount / Math.max(activeCatInfo.count, 1))}</strong></span>
                                    </div>
                                </div>
                            )}

                            {/* Category Pills list */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
                                {categoryData.map((cat, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedCategory(cat.name)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '14px',
                                            fontSize: '0.75rem',
                                            border: selectedCategory === cat.name ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.08)',
                                            background: selectedCategory === cat.name ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                                            color: selectedCategory === cat.name ? '#ffffff' : '#94a3b8',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: PALETTE[idx % PALETTE.length], marginRight: '6px' }}></span>
                                        {cat.name} ({cat.percentage}%)
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Day-of-Week Spending Velocity */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between" style={{ marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BarChart3 size={20} color="var(--warning)" /> Day-of-Week Velocity
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Identify weekend vs. weekday spending spikes</span>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <BarChart data={dayOfWeekData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                                <XAxis dataKey="shortDay" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                                <Tooltip 
                                    formatter={(value) => formatCurrency(value)}
                                    contentStyle={{ background: '#131320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                />
                                <Bar 
                                    dataKey="totalExpense" 
                                    name="Total Spent" 
                                    fill="#f59e0b" 
                                    radius={[6, 6, 0, 0]} 
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <span style={{ fontSize: '0.8rem', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={16} /> 
                            {dayOfWeekData.length > 0 && (() => {
                                const highest = [...dayOfWeekData].sort((a,b) => b.totalExpense - a.totalExpense)[0];
                                return highest?.totalExpense > 0 
                                    ? `Highest spending occurs on ${highest.day}s (${formatCurrency(highest.totalExpense)} total).` 
                                    : 'Balanced spending across all days.';
                            })()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsStudio;
