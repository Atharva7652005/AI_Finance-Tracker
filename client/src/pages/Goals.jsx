import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Target, Plus, Trash2, PiggyBank, Sparkles, CheckCircle2, Calendar, TrendingUp, X } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const COLOR_OPTIONS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];
const GOAL_CATEGORIES = ['Emergency Fund', 'Travel & Vacation', 'Gadgets & Tech', 'Vehicle', 'Education', 'Investment', 'Home', 'Other'];

const Goals = () => {
    const [goals, setGoals] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [depositModal, setDepositModal] = useState({ open: false, goal: null, amount: '' });
    const [forecasts, setForecasts] = useState({});
    const [loadingForecast, setLoadingForecast] = useState({});
    const [errorMsg, setErrorMsg] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        targetAmount: '',
        currentAmount: '',
        deadline: '',
        category: 'Emergency Fund',
        color: '#6366f1'
    });

    const fetchGoals = useCallback(async () => {
        try {
            const { data } = await api.get('/api/goals');
            setGoals(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load goals:', err);
            setErrorMsg('Unable to load your savings goals.');
        }
    }, []);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleCreateGoal = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const target = Number(formData.targetAmount);
        if (!target || target <= 0) {
            setErrorMsg('Target amount must be a positive number.');
            return;
        }

        try {
            await api.post('/api/goals', {
                ...formData,
                targetAmount: target,
                currentAmount: Number(formData.currentAmount) || 0
            });
            setShowModal(false);
            setFormData({
                title: '',
                targetAmount: '',
                currentAmount: '',
                deadline: '',
                category: 'Emergency Fund',
                color: '#6366f1'
            });
            fetchGoals();
        } catch (err) {
            console.error('Create goal error:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to create goal.');
        }
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        const depositAmt = Number(depositModal.amount);
        if (!depositAmt || depositAmt === 0) return;

        try {
            await api.post(`/api/goals/${depositModal.goal._id}/contribute`, { amount: depositAmt });
            setDepositModal({ open: false, goal: null, amount: '' });
            fetchGoals();
        } catch (err) {
            console.error('Deposit error:', err);
            alert(err.response?.data?.message || 'Deposit failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
        try {
            await api.delete(`/api/goals/${id}`);
            fetchGoals();
        } catch (err) {
            console.error('Delete goal error:', err);
        }
    };

    const handleGetForecast = async (goalId) => {
        setLoadingForecast(prev => ({ ...prev, [goalId]: true }));
        try {
            const { data } = await api.get(`/api/goals/${goalId}/forecast`);
            setForecasts(prev => ({ ...prev, [goalId]: data }));
        } catch (err) {
            console.error('Forecast error:', err);
        } finally {
            setLoadingForecast(prev => ({ ...prev, [goalId]: false }));
        }
    };

    // Calculate aggregated metrics
    const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
    const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0;
    const completedCount = goals.filter(g => g.status === 'completed').length;

    return (
        <div className="animate-fade-in delay-1">
            <div className="flex-between" style={{ marginBottom: '30px' }}>
                <div>
                    <h1>Financial Goals & Savings</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track your piggy banks and savings milestones</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={18} /> New Goal
                </button>
            </div>

            {errorMsg && (
                <div className="glass-panel" style={{ padding: '12px 20px', marginBottom: '20px', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    {errorMsg}
                </div>
            )}

            {/* Overview Summary */}
            <div className="grid-3" style={{ marginBottom: '30px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Saved</p>
                            <h2 className="text-green">{formatCurrency(totalSaved)}</h2>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <PiggyBank size={24} color="var(--success)" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Total Target</p>
                            <h2>{formatCurrency(totalTarget)}</h2>
                        </div>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <Target size={24} color="var(--accent-color)" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Overall Progress</p>
                            <h2>{overallProgress}%</h2>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <TrendingUp size={24} color="var(--warning)" />
                        </div>
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {completedCount} of {goals.length} goals achieved
                    </div>
                </div>
            </div>

            {/* Goals Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {goals.map(goal => {
                    const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                    const daysLeft = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    const forecast = forecasts[goal._id];

                    return (
                        <div key={goal._id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div className="flex-between" style={{ marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: goal.color }} />
                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{goal.title}</h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {goal.status === 'completed' && (
                                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)' }}>
                                            Completed
                                        </span>
                                    )}
                                    <button onClick={() => handleDelete(goal._id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{goal.category}</span>

                            {/* Progress bar */}
                            <div style={{ marginBottom: '16px' }}>
                                <div className="flex-between" style={{ marginBottom: '8px', fontSize: '0.9rem' }}>
                                    <span><strong>{formatCurrency(goal.currentAmount)}</strong></span>
                                    <span style={{ color: 'var(--text-secondary)' }}>of {formatCurrency(goal.targetAmount)} ({percent}%)</span>
                                </div>
                                <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                                    <div style={{ width: `${percent}%`, height: '100%', background: goal.color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                                </div>
                            </div>

                            {/* Deadline info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                <Calendar size={15} />
                                <span>{daysLeft > 0 ? `${daysLeft} days remaining (${new Date(goal.deadline).toLocaleDateString()})` : 'Deadline passed'}</span>
                            </div>

                            {/* AI Forecast Section */}
                            {forecast ? (
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                    marginBottom: '16px',
                                    fontSize: '0.85rem',
                                    lineHeight: '1.5'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '6px' }}>
                                        <Sparkles size={14} /> AI Forecast:
                                    </div>
                                    <p style={{ margin: 0, color: '#e2e8f0' }}>{forecast.recommendation}</p>
                                </div>
                            ) : null}

                            {/* Action Buttons */}
                            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', paddingTop: '10px' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                                    onClick={() => setDepositModal({ open: true, goal, amount: '' })}
                                >
                                    Deposit / Adjust
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                    onClick={() => handleGetForecast(goal._id)}
                                    disabled={loadingForecast[goal._id]}
                                    title="Get AI Forecast"
                                >
                                    <Sparkles size={16} color="var(--accent-color)" />
                                    {loadingForecast[goal._id] ? '...' : 'AI Tips'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {goals.length === 0 && (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', marginTop: '20px' }}>
                    <PiggyBank size={48} color="var(--accent-color)" style={{ marginBottom: '16px', opacity: 0.8 }} />
                    <h3>No Savings Goals Yet</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '8px auto 20px' }}>
                        Start by setting a goal for an emergency fund, travel, or a dream purchase!
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Create Your First Goal
                    </button>
                </div>
            )}

            {/* Create Goal Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: '30px', background: 'var(--bg-secondary)' }}>
                        <div className="flex-between" style={{ marginBottom: '20px' }}>
                            <h3>Create Savings Goal</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGoal}>
                            <div className="form-group">
                                <label className="form-label">Goal Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    placeholder="e.g. Goa Trip, MacBook Pro"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Target Amount (₹)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-input"
                                    required
                                    placeholder="e.g. 50000"
                                    value={formData.targetAmount}
                                    onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Starting Balance (Optional)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    placeholder="e.g. 5000"
                                    value={formData.currentAmount}
                                    onChange={e => setFormData({ ...formData, currentAmount: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Target Deadline</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    required
                                    value={formData.deadline}
                                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {GOAL_CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Color Theme</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {COLOR_OPTIONS.map(c => (
                                        <button
                                            type="button"
                                            key={c}
                                            onClick={() => setFormData({ ...formData, color: c })}
                                            style={{
                                                width: '28px', height: '28px', borderRadius: '50%', background: c,
                                                border: formData.color === c ? '3px solid white' : 'none', cursor: 'pointer'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Goal</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deposit Modal */}
            {depositModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel animate-fade-in" style={{ width: '380px', padding: '30px', background: 'var(--bg-secondary)' }}>
                        <div className="flex-between" style={{ marginBottom: '16px' }}>
                            <h3>Add or Adjust Funds</h3>
                            <button onClick={() => setDepositModal({ open: false, goal: null, amount: '' })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                            Adding funds to <strong>{depositModal.goal?.title}</strong>
                        </p>
                        <form onSubmit={handleDeposit}>
                            <div className="form-group">
                                <label className="form-label">Amount (₹) — use minus to withdraw</label>
                                <input
                                    type="number"
                                    step="100"
                                    className="form-input"
                                    required
                                    autoFocus
                                    placeholder="e.g. 2000"
                                    value={depositModal.amount}
                                    onChange={e => setDepositModal({ ...depositModal, amount: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Confirm</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setDepositModal({ open: false, goal: null, amount: '' })}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Goals;
