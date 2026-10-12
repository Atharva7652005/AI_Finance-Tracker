import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import { 
    Users, Plus, Trash2, ArrowUpRight, ArrowDownRight, CheckCircle2, 
    AlertCircle, QrCode, Share2, ArrowRight, DollarSign, PieChart as PieIcon,
    Layers, X, Wallet, Check, Copy, ExternalLink, ChevronRight
} from 'lucide-react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#ef4444'];

const SplitExpenses = () => {
    const { user } = useContext(AuthContext);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeGroupId, setActiveGroupId] = useState(null);
    const [activeGroupData, setActiveGroupData] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'expenses' | 'analytics'
    
    // Notification message
    const [message, setMessage] = useState({ text: '', type: '' });

    // Modals
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [selectedDebtToSettle, setSelectedDebtToSettle] = useState(null);
    const [copiedUpi, setCopiedUpi] = useState(false);

    // Form states
    const [groupForm, setGroupForm] = useState({
        name: '',
        category: 'Trip',
        description: '',
        members: [{ name: user?.name || 'You', upiId: '', isCurrentUser: true }]
    });

    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: '',
        category: 'Food & Dining',
        paidBy: '',
        splitType: 'equal', // 'equal' | 'exact' | 'percentage'
        selectedMembers: [], // member names for equal split
        customSplits: {}, // memberName -> exact amount or percentage
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    // Fetch all groups
    const fetchGroups = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/groups');
            setGroups(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load groups:', err);
            showBanner('Unable to load groups. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Fetch single active group data
    const fetchActiveGroup = async (groupId) => {
        try {
            const res = await api.get(`/api/groups/${groupId}`);
            setActiveGroupData(res.data);
            
            // Default expense form payer
            if (res.data.group?.members?.length > 0) {
                const currentMember = res.data.group.members.find(m => m.isCurrentUser);
                setExpenseForm(prev => ({
                    ...prev,
                    paidBy: currentMember ? currentMember.name : res.data.group.members[0].name,
                    selectedMembers: res.data.group.members.map(m => m.name)
                }));
            }
        } catch (err) {
            console.error('Failed to load group details:', err);
            showBanner('Failed to load group details.', 'error');
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (activeGroupId) {
            fetchActiveGroup(activeGroupId);
        } else {
            setActiveGroupData(null);
        }
    }, [activeGroupId]);

    const showBanner = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    };

    // Aggregate statistics across all groups
    const totalOwedToYou = groups.reduce((acc, g) => acc + (g.myBalance > 0 ? g.myBalance : 0), 0);
    const totalYouOwe = groups.reduce((acc, g) => acc + (g.myBalance < 0 ? Math.abs(g.myBalance) : 0), 0);
    const totalSharedVolume = groups.reduce((acc, g) => acc + (g.totalExpense || 0), 0);

    // Group creation handlers
    const handleAddMemberToForm = () => {
        setGroupForm(prev => ({
            ...prev,
            members: [...prev.members, { name: '', upiId: '', isCurrentUser: false }]
        }));
    };

    const handleRemoveMemberFromForm = (idx) => {
        if (groupForm.members[idx].isCurrentUser) return; // Cannot delete self
        setGroupForm(prev => ({
            ...prev,
            members: prev.members.filter((_, i) => i !== idx)
        }));
    };

    const handleMemberChange = (idx, field, value) => {
        setGroupForm(prev => {
            const updated = [...prev.members];
            updated[idx][field] = value;
            return { ...prev, members: updated };
        });
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!groupForm.name.trim()) {
            showBanner('Group name is required.', 'error');
            return;
        }

        const validMembers = groupForm.members.filter(m => m.name && m.name.trim());
        if (validMembers.length < 2) {
            showBanner('Please add at least one other friend/member to split with.', 'error');
            return;
        }

        try {
            const res = await api.post('/api/groups', {
                ...groupForm,
                members: validMembers
            });
            showBanner(`Group "${res.data.name}" created successfully!`);
            setShowCreateGroupModal(false);
            setGroupForm({
                name: '',
                category: 'Trip',
                description: '',
                members: [{ name: user?.name || 'You', upiId: '', isCurrentUser: true }]
            });
            await fetchGroups();
            setActiveGroupId(res.data._id);
        } catch (err) {
            console.error('Failed to create group:', err);
            showBanner(err.response?.data?.message || 'Error creating group.', 'error');
        }
    };

    const handleDeleteGroup = async (groupId, groupName) => {
        if (!window.confirm(`Are you sure you want to delete group "${groupName}" and all its records?`)) return;
        try {
            await api.delete(`/api/groups/${groupId}`);
            showBanner(`Group "${groupName}" deleted.`);
            if (activeGroupId === groupId) setActiveGroupId(null);
            fetchGroups();
        } catch (err) {
            console.error('Failed to delete group:', err);
            showBanner('Error deleting group.', 'error');
        }
    };

    // Add Expense Handlers
    const handleAddExpense = async (e) => {
        e.preventDefault();
        const numAmount = Number(expenseForm.amount);
        if (!numAmount || numAmount <= 0) {
            showBanner('Please enter a valid expense amount.', 'error');
            return;
        }

        if (!expenseForm.paidBy) {
            showBanner('Please select who paid.', 'error');
            return;
        }

        let calculatedSplits = [];
        if (expenseForm.splitType === 'equal') {
            if (expenseForm.selectedMembers.length === 0) {
                showBanner('Please select at least one person to split this expense.', 'error');
                return;
            }
            calculatedSplits = expenseForm.selectedMembers.map(m => ({ memberName: m }));
        } else if (expenseForm.splitType === 'exact') {
            let totalExact = 0;
            calculatedSplits = Object.keys(expenseForm.customSplits).map(m => {
                const val = Number(expenseForm.customSplits[m]) || 0;
                totalExact += val;
                return { memberName: m, amountOwed: val };
            });
            if (Math.abs(totalExact - numAmount) > 0.5) {
                showBanner(`Custom splits sum (${formatCurrency(totalExact)}) must match total expense (${formatCurrency(numAmount)}).`, 'error');
                return;
            }
        } else if (expenseForm.splitType === 'percentage') {
            let totalPct = 0;
            calculatedSplits = Object.keys(expenseForm.customSplits).map(m => {
                const pct = Number(expenseForm.customSplits[m]) || 0;
                totalPct += pct;
                return { memberName: m, percentage: pct };
            });
            if (Math.abs(totalPct - 100) > 0.5) {
                showBanner(`Percentages must add up to 100% (currently ${totalPct}%).`, 'error');
                return;
            }
        }

        try {
            await api.post(`/api/groups/${activeGroupId}/expenses`, {
                description: expenseForm.description,
                amount: numAmount,
                paidBy: expenseForm.paidBy,
                category: expenseForm.category,
                splitType: expenseForm.splitType,
                splits: calculatedSplits,
                date: expenseForm.date,
                notes: expenseForm.notes
            });

            showBanner('Expense recorded successfully!');
            setShowAddExpenseModal(false);
            setExpenseForm(prev => ({
                ...prev,
                description: '',
                amount: '',
                notes: '',
                customSplits: {}
            }));
            fetchActiveGroup(activeGroupId);
            fetchGroups();
        } catch (err) {
            console.error('Failed to add expense:', err);
            showBanner(err.response?.data?.message || 'Error recording expense.', 'error');
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Delete this expense? Balances will be recalculated.')) return;
        try {
            await api.delete(`/api/groups/${activeGroupId}/expenses/${expenseId}`);
            showBanner('Expense removed.');
            fetchActiveGroup(activeGroupId);
            fetchGroups();
        } catch (err) {
            console.error('Failed to delete expense:', err);
            showBanner('Error removing expense.', 'error');
        }
    };

    // Settlement Handlers
    const handleOpenSettleModal = (debt) => {
        setSelectedDebtToSettle(debt);
        setCopiedUpi(false);
        setShowSettleModal(true);
    };

    const handleConfirmSettlement = async () => {
        if (!selectedDebtToSettle) return;
        try {
            await api.post(`/api/groups/${activeGroupId}/settle`, {
                from: selectedDebtToSettle.from,
                to: selectedDebtToSettle.to,
                amount: selectedDebtToSettle.amount,
                notes: `Settled via UPI / Cash`
            });
            showBanner(`Settlement of ${formatCurrency(selectedDebtToSettle.amount)} between ${selectedDebtToSettle.from} and ${selectedDebtToSettle.to} recorded!`);
            setShowSettleModal(false);
            setSelectedDebtToSettle(null);
            fetchActiveGroup(activeGroupId);
            fetchGroups();
        } catch (err) {
            console.error('Failed to record settlement:', err);
            showBanner(err.response?.data?.message || 'Failed to record settlement.', 'error');
        }
    };

    // Sync user's share to Personal Transactions
    const handleSyncToPersonal = async (expenseId) => {
        try {
            const res = await api.post(`/api/groups/${activeGroupId}/expenses/${expenseId}/sync-personal`);
            showBanner(res.data.message || 'Personal share synced to Transactions!');
            fetchActiveGroup(activeGroupId);
        } catch (err) {
            console.error('Failed to sync expense:', err);
            showBanner(err.response?.data?.message || 'Failed to sync share.', 'error');
        }
    };

    // UPI Link Generator helper
    const generateUpiUrl = (upiId, recipientName, amount, note = 'Group Settlement') => {
        if (!upiId) return '';
        const pa = encodeURIComponent(upiId.trim());
        const pn = encodeURIComponent(recipientName.trim());
        const am = encodeURIComponent(amount);
        const tn = encodeURIComponent(note);
        return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
    };

    return (
        <div className="animate-fade-in delay-1" style={{ paddingBottom: '40px' }}>
            {/* Header */}
            <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {activeGroupId && (
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setActiveGroupId(null)}
                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                                ← All Groups
                            </button>
                        )}
                        <h1 style={{ margin: 0 }}>
                            {activeGroupData ? activeGroupData.group.name : 'Split Expenses & Groups'}
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {activeGroupData 
                            ? `${activeGroupData.group.category} • ${activeGroupData.group.members.length} members`
                            : 'Split bills with friends, calculate who owes whom, and settle instantly with UPI.'
                        }
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    {!activeGroupId ? (
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowCreateGroupModal(true)}
                        >
                            <Plus size={18} /> Create New Group
                        </button>
                    ) : (
                        <>
                            <button 
                                className="btn btn-primary"
                                onClick={() => setShowAddExpenseModal(true)}
                            >
                                <Plus size={18} /> Add Group Expense
                            </button>
                            <button 
                                className="btn btn-secondary"
                                style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                onClick={() => handleDeleteGroup(activeGroupId, activeGroupData.group.name)}
                            >
                                <Trash2 size={16} /> Delete Group
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Notification Toast Banner */}
            {message.text && (
                <div className={`glass-panel animate-fade-in`} style={{
                    padding: '12px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                    border: message.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                    background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                }}>
                    {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Top Aggregate Summary Stat Cards */}
            {!activeGroupId && (
                <div className="grid-3" style={{ marginBottom: '32px' }}>
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div className="flex-between">
                            <div>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>You Are Owed (Net)</p>
                                <h2 style={{ color: 'var(--success)', margin: 0 }}>{formatCurrency(totalOwedToYou)}</h2>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Friends owe this to you</span>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '14px', borderRadius: '12px' }}>
                                <ArrowUpRight size={26} color="var(--success)" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div className="flex-between">
                            <div>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>You Owe (Net)</p>
                                <h2 style={{ color: 'var(--danger)', margin: 0 }}>{formatCurrency(totalYouOwe)}</h2>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>To pay back to friends</span>
                            </div>
                            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '14px', borderRadius: '12px' }}>
                                <ArrowDownRight size={26} color="var(--danger)" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <div className="flex-between">
                            <div>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.9rem' }}>Total Shared Volume</p>
                                <h2 style={{ margin: 0 }}>{formatCurrency(totalSharedVolume)}</h2>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Across {groups.length} active groups</span>
                            </div>
                            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '14px', borderRadius: '12px' }}>
                                <Users size={26} color="var(--accent-color)" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            {!activeGroupId ? (
                /* ALL GROUPS GRID */
                <div>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={20} color="var(--accent-color)" /> Your Groups ({groups.length})
                    </h3>

                    {loading ? (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Loading your split groups...
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center' }}>
                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Users size={30} color="var(--accent-color)" />
                            </div>
                            <h3>No split groups yet</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '8px auto 20px' }}>
                                Create a group for a trip, shared flat rent, dinner with friends, or an event to easily split expenses and settle via UPI.
                            </p>
                            <button className="btn btn-primary" onClick={() => setShowCreateGroupModal(true)}>
                                <Plus size={18} /> Create Your First Group
                            </button>
                        </div>
                    ) : (
                        <div className="grid-3">
                            {groups.map(group => {
                                const isPositive = group.myBalance > 0.01;
                                const isNegative = group.myBalance < -0.01;

                                return (
                                    <div 
                                        key={group._id} 
                                        className="glass-panel" 
                                        style={{ 
                                            padding: '24px', 
                                            cursor: 'pointer',
                                            transition: 'var(--transition)',
                                            position: 'relative',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between'
                                        }}
                                        onClick={() => setActiveGroupId(group._id)}
                                    >
                                        <div>
                                            <div className="flex-between" style={{ marginBottom: '12px' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    background: 'rgba(99, 102, 241, 0.15)',
                                                    color: 'var(--accent-color)',
                                                    fontWeight: 600
                                                }}>
                                                    {group.category}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                    {group.membersCount} members
                                                </span>
                                            </div>

                                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem' }}>{group.name}</h3>
                                            {group.description && (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
                                                    {group.description}
                                                </p>
                                            )}

                                            <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px' }}>
                                                <div className="flex-between" style={{ marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Group Spend</span>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatCurrency(group.totalExpense)}</span>
                                                </div>
                                                <div className="flex-between">
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your Balance</span>
                                                    <span style={{ 
                                                        fontWeight: 700, 
                                                        fontSize: '0.95rem',
                                                        color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : '#94a3b8'
                                                    }}>
                                                        {isPositive && `+${formatCurrency(group.myBalance)} (Owed to you)`}
                                                        {isNegative && `-${formatCurrency(Math.abs(group.myBalance))} (You owe)`}
                                                        {!isPositive && !isNegative && 'Settled up'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: 'var(--accent-color)', fontSize: '0.85rem', fontWeight: 600, gap: '4px' }}>
                                            Open Ledger <ChevronRight size={16} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* ACTIVE GROUP VIEW */
                activeGroupData && (
                    <div>
                        {/* Group Header Banner */}
                        <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                            <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <h2 style={{ margin: 0 }}>{activeGroupData.group.name}</h2>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            color: 'var(--accent-color)',
                                            fontWeight: 600
                                        }}>
                                            {activeGroupData.group.category}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Members:</span>
                                        {activeGroupData.group.members.map((m, i) => (
                                            <span 
                                                key={i} 
                                                style={{ 
                                                    fontSize: '0.8rem', 
                                                    background: m.isCurrentUser ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                                                    border: m.isCurrentUser ? '1px solid var(--accent-color)' : '1px solid rgba(255, 255, 255, 0.1)',
                                                    padding: '3px 10px', 
                                                    borderRadius: '14px',
                                                    color: m.isCurrentUser ? '#ffffff' : '#cbd5e1'
                                                }}
                                            >
                                                {m.name} {m.isCurrentUser && '(You)'} {m.upiId && `• ${m.upiId}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Group Spend</span>
                                    <h2 style={{ margin: '4px 0 0 0', color: 'var(--accent-color)' }}>
                                        {formatCurrency(activeGroupData.totalExpense)}
                                    </h2>
                                </div>
                            </div>

                            {/* Sub-Tabs */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                                <button 
                                    className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setActiveTab('overview')}
                                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                                >
                                    <Wallet size={16} /> Overview & Balances
                                </button>
                                <button 
                                    className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setActiveTab('expenses')}
                                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                                >
                                    <DollarSign size={16} /> Expenses ({activeGroupData.group.expenses?.length || 0})
                                </button>
                                <button 
                                    className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setActiveTab('analytics')}
                                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                                >
                                    <PieIcon size={16} /> Visual Analytics
                                </button>
                            </div>
                        </div>

                        {/* TAB 1: OVERVIEW & BALANCES */}
                        {activeTab === 'overview' && (
                            <div className="grid-2">
                                {/* Left: Simplified Settlement Plan ("Who Owes Whom") */}
                                <div className="glass-panel" style={{ padding: '24px' }}>
                                    <div className="flex-between" style={{ marginBottom: '16px' }}>
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Share2 size={20} color="var(--accent-color)" /> 
                                            Optimal Settlement Plan
                                        </h3>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                            Simplified to minimum transfers
                                        </span>
                                    </div>

                                    {(!activeGroupData.simplifiedDebts || activeGroupData.simplifiedDebts.length === 0) ? (
                                        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)' }}>
                                            <CheckCircle2 size={40} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                                            <p style={{ margin: 0, fontWeight: 600 }}>Everyone is fully settled up!</p>
                                            <span style={{ fontSize: '0.85rem' }}>No outstanding debts remain in this group.</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {activeGroupData.simplifiedDebts.map((debt, idx) => {
                                                const currentUserMember = activeGroupData.group.members.find(m => m.isCurrentUser);
                                                const isYouPaying = currentUserMember && debt.from === currentUserMember.name;
                                                const isYouReceiving = currentUserMember && debt.to === currentUserMember.name;

                                                return (
                                                    <div 
                                                        key={idx}
                                                        style={{
                                                            padding: '16px',
                                                            borderRadius: '12px',
                                                            background: isYouPaying ? 'rgba(239, 68, 68, 0.08)' : isYouReceiving ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                            border: isYouPaying ? '1px solid rgba(239, 68, 68, 0.3)' : isYouReceiving ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            flexWrap: 'wrap',
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 600, color: isYouPaying ? 'var(--danger)' : '#ffffff' }}>
                                                                    {debt.from} {isYouPaying && '(You)'}
                                                                </span>
                                                                <ArrowRight size={16} color="#94a3b8" />
                                                                <span style={{ fontWeight: 600, color: isYouReceiving ? 'var(--success)' : '#ffffff' }}>
                                                                    {debt.to} {isYouReceiving && '(You)'}
                                                                </span>
                                                            </div>
                                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                                {debt.toUpiId ? `UPI: ${debt.toUpiId}` : 'Cash / Bank Transfer'}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isYouPaying ? 'var(--danger)' : isYouReceiving ? 'var(--success)' : '#ffffff' }}>
                                                                {formatCurrency(debt.amount)}
                                                            </span>
                                                            
                                                            <button 
                                                                className="btn btn-primary"
                                                                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                                onClick={() => handleOpenSettleModal(debt)}
                                                            >
                                                                <QrCode size={14} /> Settle / UPI
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Member Net Balances */}
                                <div className="glass-panel" style={{ padding: '24px' }}>
                                    <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Users size={20} color="var(--accent-color)" /> 
                                        Member Net Balances
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {activeGroupData.group.members.map((m, idx) => {
                                            const bal = activeGroupData.netBalances[m.name] || 0;
                                            const rounded = Math.round(bal * 100) / 100;
                                            const isPos = rounded > 0.01;
                                            const isNeg = rounded < -0.01;

                                            return (
                                                <div 
                                                    key={idx}
                                                    style={{
                                                        padding: '14px 18px',
                                                        borderRadius: '10px',
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                                            {m.name} {m.isCurrentUser && '(You)'}
                                                        </span>
                                                        {m.upiId && (
                                                            <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                                {m.upiId}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span style={{ 
                                                        fontWeight: 700, 
                                                        fontSize: '1rem',
                                                        color: isPos ? 'var(--success)' : isNeg ? 'var(--danger)' : '#94a3b8'
                                                    }}>
                                                        {isPos && `+${formatCurrency(rounded)} (Gets back)`}
                                                        {isNeg && `-${formatCurrency(Math.abs(rounded))} (Owes)`}
                                                        {!isPos && !isNeg && 'Settled up'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: EXPENSES LEDGER */}
                        {activeTab === 'expenses' && (
                            <div className="glass-panel" style={{ padding: '24px' }}>
                                <div className="flex-between" style={{ marginBottom: '20px' }}>
                                    <h3 style={{ margin: 0 }}>Expenses History</h3>
                                    <button className="btn btn-primary" onClick={() => setShowAddExpenseModal(true)}>
                                        <Plus size={16} /> Add Expense
                                    </button>
                                </div>

                                {(!activeGroupData.group.expenses || activeGroupData.group.expenses.length === 0) ? (
                                    <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)' }}>
                                        No expenses recorded yet. Click "Add Expense" to get started.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {activeGroupData.group.expenses.slice().reverse().map(exp => {
                                            const currentUserMember = activeGroupData.group.members.find(m => m.isCurrentUser);
                                            const mySplit = exp.splits?.find(s => s.memberName === (currentUserMember?.name || 'You'));
                                            const myShareAmount = mySplit ? mySplit.amountOwed : 0;

                                            return (
                                                <div 
                                                    key={exp._id}
                                                    style={{
                                                        padding: '18px 20px',
                                                        borderRadius: '12px',
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        flexWrap: 'wrap',
                                                        gap: '14px'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{exp.description}</span>
                                                            <span style={{ 
                                                                fontSize: '0.75rem', 
                                                                padding: '3px 8px', 
                                                                borderRadius: '12px', 
                                                                background: 'rgba(99, 102, 241, 0.15)', 
                                                                color: 'var(--accent-color)' 
                                                            }}>
                                                                {exp.category}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                            <span>Paid by: <strong style={{ color: '#ffffff' }}>{exp.paidBy}</strong></span>
                                                            <span>Date: {new Date(exp.date).toLocaleDateString()}</span>
                                                            <span>Split: {exp.splitType}</span>
                                                            {myShareAmount > 0 && (
                                                                <span style={{ color: 'var(--warning)' }}>
                                                                    Your Share: {formatCurrency(myShareAmount)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                                            {formatCurrency(exp.amount)}
                                                        </span>

                                                        {myShareAmount > 0 && (
                                                            exp.syncedToPersonal ? (
                                                                <span style={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '4px', 
                                                                    fontSize: '0.8rem', 
                                                                    color: 'var(--success)', 
                                                                    background: 'rgba(16, 185, 129, 0.1)', 
                                                                    padding: '6px 12px', 
                                                                    borderRadius: '8px' 
                                                                }}>
                                                                    <Check size={14} /> Synced to Personal
                                                                </span>
                                                            ) : (
                                                                <button 
                                                                    className="btn btn-secondary"
                                                                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                                                    title="Copy your personal share into personal transactions"
                                                                    onClick={() => handleSyncToPersonal(exp._id)}
                                                                >
                                                                    <Share2 size={13} /> Sync Share ({formatCurrency(myShareAmount)})
                                                                </button>
                                                            )
                                                        )}

                                                        <button 
                                                            className="btn btn-secondary"
                                                            style={{ padding: '6px 10px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                                            onClick={() => handleDeleteExpense(exp._id)}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: VISUAL ANALYTICS */}
                        {activeTab === 'analytics' && (
                            <div className="grid-2">
                                {/* Category Pie Chart */}
                                <div className="glass-panel" style={{ padding: '24px' }}>
                                    <h3 style={{ margin: '0 0 16px 0' }}>Spend by Category</h3>
                                    {(!activeGroupData.categoryBreakdown || activeGroupData.categoryBreakdown.length === 0) ? (
                                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>No category data yet.</p>
                                    ) : (
                                        <div style={{ width: '100%', height: 260 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={activeGroupData.categoryBreakdown}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={55}
                                                        outerRadius={85}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                    >
                                                        {activeGroupData.categoryBreakdown.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        formatter={(value) => formatCurrency(value)}
                                                        contentStyle={{ background: '#181826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>

                                {/* Who Paid What Bar Chart */}
                                <div className="glass-panel" style={{ padding: '24px' }}>
                                    <h3 style={{ margin: '0 0 16px 0' }}>Member Spend Contribution</h3>
                                    {(!activeGroupData.payerBreakdown || activeGroupData.payerBreakdown.length === 0) ? (
                                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>No contribution data yet.</p>
                                    ) : (
                                        <div style={{ width: '100%', height: 260 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={activeGroupData.payerBreakdown}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                                    <XAxis dataKey="name" stroke="#94a3b8" />
                                                    <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                                                    <Tooltip 
                                                        formatter={(value) => formatCurrency(value)}
                                                        contentStyle={{ background: '#181826', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                    />
                                                    <Bar dataKey="amount" fill="var(--accent-color)" radius={[6, 6, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            )}

            {/* MODAL 1: CREATE GROUP */}
            {showCreateGroupModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel animate-fade-in" style={{
                        width: '90%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', padding: '28px'
                    }}>
                        <div className="flex-between" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Create New Split Group</h3>
                            <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', borderRadius: '50%' }}
                                onClick={() => setShowCreateGroupModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateGroup}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label">Group Name *</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. Goa Trip 2026, Flat 402 Rent, Friday Dinner"
                                    required
                                    value={groupForm.name}
                                    onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                />
                            </div>

                            <div className="grid-2" style={{ marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select 
                                        className="form-select"
                                        value={groupForm.category}
                                        onChange={e => setGroupForm({ ...groupForm, category: e.target.value })}
                                    >
                                        <option value="Trip">Trip</option>
                                        <option value="Flat/Home">Flat / Home</option>
                                        <option value="Dining">Dining</option>
                                        <option value="Event">Event</option>
                                        <option value="Project">Project</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description (Optional)</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="e.g. Weekend getaway expenses"
                                        value={groupForm.description}
                                        onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <div className="flex-between" style={{ marginBottom: '10px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Group Members (Min 2)</label>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                        onClick={handleAddMemberToForm}
                                    >
                                        <Plus size={14} /> Add Friend
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {groupForm.members.map((m, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input 
                                                type="text"
                                                className="form-input"
                                                style={{ flex: 1.2 }}
                                                placeholder={m.isCurrentUser ? 'Your Name' : 'Friend Name'}
                                                value={m.name}
                                                required
                                                disabled={m.isCurrentUser}
                                                onChange={e => handleMemberChange(idx, 'name', e.target.value)}
                                            />
                                            <input 
                                                type="text"
                                                className="form-input"
                                                style={{ flex: 1.5 }}
                                                placeholder="UPI ID (e.g. name@oksbi)"
                                                value={m.upiId}
                                                onChange={e => handleMemberChange(idx, 'upiId', e.target.value)}
                                            />
                                            {!m.isCurrentUser && (
                                                <button 
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    style={{ padding: '8px', color: 'var(--danger)' }}
                                                    onClick={() => handleRemoveMemberFromForm(idx)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateGroupModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: ADD EXPENSE */}
            {showAddExpenseModal && activeGroupData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel animate-fade-in" style={{
                        width: '90%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '28px'
                    }}>
                        <div className="flex-between" style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Add Group Expense</h3>
                            <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', borderRadius: '50%' }}
                                onClick={() => setShowAddExpenseModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense}>
                            <div className="form-group" style={{ marginBottom: '14px' }}>
                                <label className="form-label">Description *</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="e.g. Dinner, Airbnb Booking, Groceries, Petrol"
                                    required
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                />
                            </div>

                            <div className="grid-2" style={{ marginBottom: '14px' }}>
                                <div className="form-group">
                                    <label className="form-label">Total Amount (₹) *</label>
                                    <input 
                                        type="number" 
                                        min="0.01" 
                                        step="0.01"
                                        className="form-input" 
                                        placeholder="0.00"
                                        required
                                        value={expenseForm.amount}
                                        onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select 
                                        className="form-select"
                                        value={expenseForm.category}
                                        onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    >
                                        <option value="Food & Dining">Food & Dining</option>
                                        <option value="Travel & Fuel">Travel & Fuel</option>
                                        <option value="Accommodation">Accommodation</option>
                                        <option value="Entertainment">Entertainment</option>
                                        <option value="Utilities & Bills">Utilities & Bills</option>
                                        <option value="Groceries">Groceries</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid-2" style={{ marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Paid By</label>
                                    <select 
                                        className="form-select"
                                        value={expenseForm.paidBy}
                                        onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                                    >
                                        {activeGroupData.group.members.map((m, i) => (
                                            <option key={i} value={m.name}>
                                                {m.name} {m.isCurrentUser && '(You)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input 
                                        type="date"
                                        className="form-input"
                                        value={expenseForm.date}
                                        onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Split Options */}
                            <div style={{ marginBottom: '18px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                <div className="flex-between" style={{ marginBottom: '12px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Split Method</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {['equal', 'exact', 'percentage'].map(type => (
                                            <button
                                                type="button"
                                                key={type}
                                                className={`btn ${expenseForm.splitType === type ? 'btn-primary' : 'btn-secondary'}`}
                                                style={{ padding: '4px 10px', fontSize: '0.75rem', textTransform: 'capitalize' }}
                                                onClick={() => setExpenseForm({ ...expenseForm, splitType: type })}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* EQUAL SPLIT */}
                                {expenseForm.splitType === 'equal' && (
                                    <div>
                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 10px 0' }}>
                                            Select who is involved in this expense:
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {activeGroupData.group.members.map((m, i) => {
                                                const isSelected = expenseForm.selectedMembers.includes(m.name);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={i}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setExpenseForm({
                                                                    ...expenseForm,
                                                                    selectedMembers: expenseForm.selectedMembers.filter(name => name !== m.name)
                                                                });
                                                            } else {
                                                                setExpenseForm({
                                                                    ...expenseForm,
                                                                    selectedMembers: [...expenseForm.selectedMembers, m.name]
                                                                });
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '6px 14px',
                                                            borderRadius: '20px',
                                                            border: isSelected ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)',
                                                            background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                                                            color: isSelected ? '#ffffff' : '#94a3b8',
                                                            fontSize: '0.85rem',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isSelected ? '✓ ' : '+ '} {m.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {Number(expenseForm.amount) > 0 && expenseForm.selectedMembers.length > 0 && (
                                            <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--accent-color)' }}>
                                                Each person pays: <strong>{formatCurrency(Number(expenseForm.amount) / expenseForm.selectedMembers.length)}</strong>
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* EXACT SPLIT */}
                                {expenseForm.splitType === 'exact' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activeGroupData.group.members.map((m, i) => (
                                            <div key={i} className="flex-between">
                                                <span style={{ fontSize: '0.9rem' }}>{m.name}</span>
                                                <input 
                                                    type="number"
                                                    placeholder="₹0"
                                                    className="form-input"
                                                    style={{ width: '130px', padding: '6px 10px' }}
                                                    value={expenseForm.customSplits[m.name] || ''}
                                                    onChange={e => setExpenseForm({
                                                        ...expenseForm,
                                                        customSplits: { ...expenseForm.customSplits, [m.name]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* PERCENTAGE SPLIT */}
                                {expenseForm.splitType === 'percentage' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activeGroupData.group.members.map((m, i) => (
                                            <div key={i} className="flex-between">
                                                <span style={{ fontSize: '0.9rem' }}>{m.name}</span>
                                                <input 
                                                    type="number"
                                                    placeholder="0 %"
                                                    className="form-input"
                                                    style={{ width: '100px', padding: '6px 10px' }}
                                                    value={expenseForm.customSplits[m.name] || ''}
                                                    onChange={e => setExpenseForm({
                                                        ...expenseForm,
                                                        customSplits: { ...expenseForm.customSplits, [m.name]: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddExpenseModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: UPI SETTLEMENT & QR CODE */}
            {showSettleModal && selectedDebtToSettle && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel animate-fade-in" style={{
                        width: '90%', maxWidth: '460px', padding: '28px', textAlign: 'center'
                    }}>
                        <div className="flex-between" style={{ marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <QrCode size={20} color="var(--accent-color)" /> Settle Payment
                            </h3>
                            <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', borderRadius: '50%' }}
                                onClick={() => setShowSettleModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ margin: '16px 0', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                            <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                <strong>{selectedDebtToSettle.from}</strong> pays <strong>{selectedDebtToSettle.to}</strong>
                            </p>
                            <h2 style={{ color: 'var(--success)', margin: 0 }}>
                                {formatCurrency(selectedDebtToSettle.amount)}
                            </h2>
                        </div>

                        {/* UPI QR Code if recipient has UPI ID */}
                        {selectedDebtToSettle.toUpiId ? (
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ 
                                    background: '#ffffff', 
                                    padding: '16px', 
                                    borderRadius: '16px', 
                                    display: 'inline-block',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                                }}>
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generateUpiUrl(selectedDebtToSettle.toUpiId, selectedDebtToSettle.to, selectedDebtToSettle.amount, `Settlement: ${activeGroupData.group.name}`))}`}
                                        alt="UPI QR Code"
                                        style={{ width: '180px', height: '180px', display: 'block' }}
                                    />
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '10px' }}>
                                    Scan with Google Pay, PhonePe, or Paytm
                                </p>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button 
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                                        onClick={() => {
                                            const upiUrl = generateUpiUrl(selectedDebtToSettle.toUpiId, selectedDebtToSettle.to, selectedDebtToSettle.amount, `Settlement: ${activeGroupData.group.name}`);
                                            navigator.clipboard.writeText(upiUrl);
                                            setCopiedUpi(true);
                                            setTimeout(() => setCopiedUpi(false), 3000);
                                        }}
                                    >
                                        <Copy size={14} /> {copiedUpi ? 'Copied Link!' : 'Copy UPI Link'}
                                    </button>
                                    <a 
                                        href={generateUpiUrl(selectedDebtToSettle.toUpiId, selectedDebtToSettle.to, selectedDebtToSettle.amount, `Settlement: ${activeGroupData.group.name}`)}
                                        className="btn btn-secondary"
                                        style={{ fontSize: '0.85rem', padding: '6px 14px', textDecoration: 'none' }}
                                    >
                                        <ExternalLink size={14} /> Open UPI App
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '20px' }}>
                                No UPI ID recorded for {selectedDebtToSettle.to}. You can pay directly via Cash, NEFT/IMPS or your preferred banking app.
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setShowSettleModal(false)}
                            >
                                Close
                            </button>
                            <button 
                                className="btn btn-primary"
                                style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                                onClick={handleConfirmSettlement}
                            >
                                <CheckCircle2 size={16} /> Mark as Settled
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SplitExpenses;
