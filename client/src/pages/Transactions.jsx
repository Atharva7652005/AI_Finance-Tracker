import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        amount: '', type: 'expense', category: '', date: new Date().toISOString().split('T')[0], notes: ''
    });

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        const { data } = await axios.get('/api/transactions');
        setTransactions(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/transactions', formData);
            fetchTransactions();
            setShowForm(false);
            setFormData({ amount: '', type: 'expense', category: '', date: new Date().toISOString().split('T')[0], notes: '' });
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/transactions/${id}`);
            fetchTransactions();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="animate-fade-in delay-2">
            <div className="flex-between" style={{ marginBottom: '30px' }}>
                <h1>Transactions</h1>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                    <Plus size={18} /> Add Transaction
                </button>
            </div>

            {showForm && (
                <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '30px' }}>
                    <form onSubmit={handleSubmit} className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>₹</span>
                                <input type="number" className="form-input" style={{ paddingLeft: '30px' }} required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="Enter amount in ₹" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input type="text" className="form-input" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Notes</label>
                            <input type="text" className="form-input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <button type="submit" className="btn btn-primary">Save Transaction</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <tr>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Category</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Notes</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: 'var(--text-secondary)' }}>Amount</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(t => (
                            <tr key={t._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '16px' }}>{new Date(t.date).toLocaleDateString()}</td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{ 
                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem',
                                        background: t.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: t.type === 'income' ? 'var(--success)' : 'var(--danger)'
                                    }}>
                                        {t.category}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{t.notes}</td>
                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '500', color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                    <button onClick={() => handleDelete(t._id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No transactions found. Adding some!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Transactions;
