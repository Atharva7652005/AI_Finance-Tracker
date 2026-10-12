import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { Plus, Trash2, Pencil, X, Download, Search, Scan } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import ExportModal from '../components/ExportModal';
import ReceiptScannerModal from '../components/ReceiptScannerModal';

const CATEGORY_SUGGESTIONS = [
    'Salary', 'Freelance', 'Food & Dining', 'Rent & Housing',
    'Utilities & Bills', 'Groceries', 'Shopping', 'Transportation',
    'Entertainment', 'Healthcare', 'Investments', 'Other'
];

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [editId, setEditId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        amount: '',
        type: 'expense',
        category: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const fetchTransactions = useCallback(async () => {
        try {
            const { data } = await api.get('/api/transactions');
            setTransactions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load transactions:', err);
            setErrorMsg('Failed to load transactions.');
        }
    }, []);
    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const { data } = await api.get('/api/transactions');
                if (isMounted) {
                    setTransactions(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to load transactions:', err);
                    setErrorMsg('Failed to load transactions.');
                }
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    const handleOpenAdd = () => {
        setEditId(null);
        setFormData({
            amount: '',
            type: 'expense',
            category: '',
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setErrorMsg('');
        setShowForm(true);
    };

    const handleEdit = (t) => {
        setEditId(t._id);
        setFormData({
            amount: t.amount,
            type: t.type,
            category: t.category,
            date: t.date ? new Date(t.date).toISOString().split('T')[0] : '',
            notes: t.notes || ''
        });
        setErrorMsg('');
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditId(null);
        setErrorMsg('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const numericAmount = Number(formData.amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setErrorMsg('Amount must be a positive number.');
            return;
        }

        try {
            const payload = {
                ...formData,
                amount: numericAmount,
                category: formData.category.trim()
            };

            if (editId) {
                await api.put(`/api/transactions/${editId}`, payload);
            } else {
                await api.post('/api/transactions', payload);
            }

            await fetchTransactions();
            handleCancelForm();
        } catch (err) {
            console.error('Save transaction error:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to save transaction.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;
        try {
            await api.delete(`/api/transactions/${id}`);
            await fetchTransactions();
        } catch (err) {
            console.error('Delete transaction error:', err);
            setErrorMsg('Failed to delete transaction.');
        }
    };

    const categories = useMemo(() => {
        return Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));
    }, [transactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (filterType !== 'all' && t.type !== filterType) return false;
            if (filterCategory !== 'all' && t.category !== filterCategory) return false;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchCat = t.category?.toLowerCase().includes(query);
                const matchNotes = t.notes?.toLowerCase().includes(query);
                const matchAmount = String(t.amount).includes(query);
                if (!matchCat && !matchNotes && !matchAmount) return false;
            }
            return true;
        });
    }, [transactions, filterType, filterCategory, searchQuery]);

    return (
        <div className="animate-fade-in delay-2">
            <div className="flex-between" style={{ marginBottom: '30px' }}>
                <div>
                    <h1>Transactions</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your income and expenses</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => setShowScanner(true)}>
                        <Scan size={18} /> Scan Receipt
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowExport(true)}>
                        <Download size={18} /> Export
                    </button>
                    <button className="btn btn-primary" onClick={showForm ? handleCancelForm : handleOpenAdd}>
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? 'Cancel' : 'Add Transaction'}
                    </button>
                </div>
            </div>

            <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} transactions={transactions} />
            <ReceiptScannerModal 
                isOpen={showScanner} 
                onClose={() => setShowScanner(false)} 
                onTransactionSaved={fetchTransactions} 
            />

            {errorMsg && (
                <div className="glass-panel" style={{ padding: '12px 20px', marginBottom: '20px', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    {errorMsg}
                </div>
            )}

            {showForm && (
                <div className="glass-panel animate-fade-in" style={{ padding: '24px', marginBottom: '30px' }}>
                    <h3 style={{ marginBottom: '20px' }}>{editId ? 'Edit Transaction' : 'New Transaction'}</h3>
                    <form onSubmit={handleSubmit} className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select 
                                className="form-select" 
                                value={formData.type} 
                                onChange={e => setFormData({...formData, type: e.target.value})}
                            >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>₹</span>
                                <input 
                                    type="number" 
                                    min="0.01" 
                                    step="0.01"
                                    className="form-input" 
                                    style={{ paddingLeft: '30px' }} 
                                    required 
                                    value={formData.amount} 
                                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                                    placeholder="Enter amount in ₹" 
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                list="category-suggestions"
                                required 
                                value={formData.category} 
                                onChange={e => setFormData({...formData, category: e.target.value})} 
                                placeholder="e.g. Food & Dining, Rent, Salary"
                            />
                            <datalist id="category-suggestions">
                                {CATEGORY_SUGGESTIONS.map(cat => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input 
                                type="date" 
                                className="form-input" 
                                required 
                                value={formData.date} 
                                onChange={e => setFormData({...formData, date: e.target.value})} 
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Notes (Optional)</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                value={formData.notes} 
                                onChange={e => setFormData({...formData, notes: e.target.value})} 
                                placeholder="Add descriptive notes..."
                            />
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn btn-primary">
                                {editId ? 'Update Transaction' : 'Save Transaction'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={handleCancelForm}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter and Search Bar with Enhanced Dropdowns */}
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: '1 1 220px', position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '38px' }}
                        placeholder="Search category, notes, or amount..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div style={{ width: '160px' }}>
                    <select
                        className="form-select"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="expense">Expenses Only</option>
                        <option value="income">Income Only</option>
                    </select>
                </div>
                <div style={{ width: '180px' }}>
                    <select
                        className="form-select"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                {(filterType !== 'all' || filterCategory !== 'all' || searchQuery) && (
                    <button
                        className="btn btn-ghost"
                        onClick={() => { setFilterType('all'); setFilterCategory('all'); setSearchQuery(''); }}
                        style={{ padding: '10px 14px' }}
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
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
                            {filteredTransactions.map(t => (
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
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{t.notes || '—'}</td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '500', color: t.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                                            <button 
                                                onClick={() => handleEdit(t)} 
                                                title="Edit"
                                                style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(t._id)} 
                                                title="Delete"
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        {transactions.length === 0 
                                            ? 'No transactions recorded yet. Click "Add Transaction" to create your first entry!'
                                            : 'No transactions match the selected filters.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Transactions;
