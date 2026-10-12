import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Repeat, Plus, Trash2, Calendar, AlertTriangle, Sparkles, Check, X, ShieldAlert, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const CATEGORIES = ['Entertainment', 'Streaming & Music', 'Utilities & Bills', 'Software & Cloud', 'Fitness & Health', 'Insurance', 'Housing', 'Other'];

const Subscriptions = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [upcomingData, setUpcomingData] = useState({ upcoming: [], dueIn7Days: [], totalDueIn7Days: 0, totalDueIn30Days: 0 });
    const [detectedList, setDetectedList] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        billingCycle: 'monthly',
        nextBillingDate: new Date().toISOString().split('T')[0],
        category: 'Entertainment',
        notes: ''
    });

    const fetchData = useCallback(async () => {
        try {
            const [subsRes, upRes] = await Promise.all([
                api.get('/api/subscriptions'),
                api.get('/api/subscriptions/upcoming')
            ]);
            setSubscriptions(Array.isArray(subsRes.data) ? subsRes.data : []);
            setUpcomingData(upRes.data || { upcoming: [], dueIn7Days: [], totalDueIn7Days: 0, totalDueIn30Days: 0 });
        } catch (err) {
            console.error('Failed to load subscriptions:', err);
            setErrorMsg('Unable to load subscriptions.');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const numericAmount = Number(formData.amount);
        if (!numericAmount || numericAmount <= 0) {
            setErrorMsg('Amount must be a positive number.');
            return;
        }

        try {
            await api.post('/api/subscriptions', {
                ...formData,
                amount: numericAmount
            });
            setShowModal(false);
            setFormData({
                name: '',
                amount: '',
                billingCycle: 'monthly',
                nextBillingDate: new Date().toISOString().split('T')[0],
                category: 'Entertainment',
                notes: ''
            });
            fetchData();
        } catch (err) {
            console.error('Save subscription error:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to save subscription.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this subscription?')) return;
        try {
            await api.delete(`/api/subscriptions/${id}`);
            fetchData();
        } catch (err) {
            console.error('Delete subscription error:', err);
        }
    };

    const handleScanTransactions = async () => {
        setScanning(true);
        try {
            const { data } = await api.get('/api/subscriptions/detect');
            setDetectedList(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Scan error:', err);
        } finally {
            setScanning(false);
        }
    };

    const handleAddDetected = async (detectedItem) => {
        try {
            await api.post('/api/subscriptions', {
                name: detectedItem.name,
                amount: detectedItem.amount,
                billingCycle: 'monthly',
                nextBillingDate: detectedItem.estimatedNextDate,
                category: detectedItem.category || 'Utilities & Bills'
            });
            setDetectedList(prev => prev.filter(d => d.name !== detectedItem.name));
            fetchData();
        } catch (err) {
            console.error('Add detected error:', err);
        }
    };

    // Calculate monthly commitment
    const monthlyCommitment = subscriptions.reduce((acc, s) => {
        if (s.billingCycle === 'monthly') return acc + s.amount;
        if (s.billingCycle === 'quarterly') return acc + (s.amount / 3);
        if (s.billingCycle === 'yearly') return acc + (s.amount / 12);
        return acc + s.amount;
    }, 0);

    return (
        <div className="animate-fade-in delay-2">
            <div className="flex-between" style={{ marginBottom: '30px' }}>
                <div>
                    <h1>Recurring Subscriptions & Bills</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track renewals, ongoing commitments, and due dates</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn"
                        style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-color)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
                        onClick={handleScanTransactions}
                        disabled={scanning}
                    >
                        <Sparkles size={16} />
                        {scanning ? 'Scanning...' : 'Auto-Detect Bills'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Add Subscription
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div className="glass-panel" style={{ padding: '12px 20px', marginBottom: '20px', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    {errorMsg}
                </div>
            )}

            {/* Upcoming Bills Alert Banner */}
            {upcomingData.dueIn7Days?.length > 0 && (
                <div className="glass-panel" style={{
                    padding: '16px 24px',
                    marginBottom: '24px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <AlertTriangle color="var(--warning)" size={24} />
                    <div>
                        <strong style={{ color: 'var(--warning)' }}>Upcoming Bills Alert:</strong> You have {upcomingData.dueIn7Days.length} bill(s) due within the next 7 days totaling <strong>{formatCurrency(upcomingData.totalDueIn7Days)}</strong>.
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid-3" style={{ marginBottom: '30px' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Monthly Fixed Spend</p>
                            <h2>{formatCurrency(monthlyCommitment)}</h2>
                        </div>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <Repeat size={24} color="var(--accent-color)" />
                        </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Across {subscriptions.length} recurring services
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Due in 7 Days</p>
                            <h2 className="text-red">{formatCurrency(upcomingData.totalDueIn7Days)}</h2>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <Calendar size={24} color="var(--danger)" />
                        </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {upcomingData.dueIn7Days?.length || 0} payment(s) pending
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div className="flex-between">
                        <div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Next 30 Days Outflow</p>
                            <h2>{formatCurrency(upcomingData.totalDueIn30Days)}</h2>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
                            <CreditCard size={24} color="var(--success)" />
                        </div>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        All upcoming renewals
                    </div>
                </div>
            </div>

            {/* Auto-detected items section */}
            {detectedList.length > 0 && (
                <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '30px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <div className="flex-between" style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Sparkles size={18} color="var(--accent-color)" />
                            <h3 style={{ fontSize: '1.05rem', margin: 0 }}>Detected Recurring Payments</h3>
                        </div>
                        <button onClick={() => setDetectedList([])} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <X size={18} />
                        </button>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                        We identified these repeating charges in your transaction history. Add them to track automatically:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {detectedList.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {formatCurrency(item.amount)}/mo • {item.occurrences} past charges
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    onClick={() => handleAddDetected(item)}
                                >
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Subscriptions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {subscriptions.map(sub => {
                    const daysUntil = Math.ceil((new Date(sub.nextBillingDate) - new Date()) / (1000 * 60 * 60 * 24));
                    const isUrgent = daysUntil >= 0 && daysUntil <= 7;

                    return (
                        <div key={sub._id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                            <div className="flex-between" style={{ marginBottom: '10px' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{sub.name}</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.category}</span>
                                </div>
                                <button onClick={() => handleDelete(sub._id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div style={{ margin: '14px 0' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {formatCurrency(sub.amount)}
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '4px' }}>
                                        / {sub.billingCycle}
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                background: isUrgent ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.3)' : 'var(--glass-border)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.85rem',
                                marginTop: 'auto'
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Next Billing:</span>
                                <strong style={{ color: isUrgent ? 'var(--danger)' : 'var(--text-primary)' }}>
                                    {new Date(sub.nextBillingDate).toLocaleDateString()}
                                    {daysUntil >= 0 ? ` (${daysUntil}d)` : ' (Overdue)'}
                                </strong>
                            </div>
                        </div>
                    );
                })}
            </div>

            {subscriptions.length === 0 && (
                <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', marginTop: '20px' }}>
                    <Repeat size={48} color="var(--accent-color)" style={{ marginBottom: '16px', opacity: 0.8 }} />
                    <h3>No Active Subscriptions</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '8px auto 20px' }}>
                        Keep track of your monthly services, streaming, bills, and utilities to prevent accidental renewals!
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={18} /> Add Your First Subscription
                    </button>
                </div>
            )}

            {/* Add Subscription Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: '30px', background: 'var(--bg-secondary)' }}>
                        <div className="flex-between" style={{ marginBottom: '20px' }}>
                            <h3>Add Subscription / Bill</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label">Service / Bill Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    required
                                    placeholder="e.g. Netflix, Gym, Electricity, WiFi"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount (₹)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-input"
                                    required
                                    placeholder="e.g. 649"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Billing Cycle</label>
                                <select
                                    className="form-select"
                                    value={formData.billingCycle}
                                    onChange={e => setFormData({ ...formData, billingCycle: e.target.value })}
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Next Renewal / Due Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    required
                                    value={formData.nextBillingDate}
                                    onChange={e => setFormData({ ...formData, nextBillingDate: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Subscription</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subscriptions;
