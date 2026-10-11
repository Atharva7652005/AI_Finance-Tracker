import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Download, FileText, FileSpreadsheet, X, Check } from 'lucide-react';
import { exportToCSV, exportToExcel, printPDFStatement } from '../utils/exporter';

const ExportModal = ({ isOpen, onClose, transactions }) => {
    const { user } = useContext(AuthContext);
    const [format, setFormat] = useState('pdf'); // 'pdf' | 'csv' | 'excel'
    const [scope, setScope] = useState('all'); // 'all' | 'this_month' | 'expense' | 'income'

    if (!isOpen) return null;

    const getFilteredTransactions = () => {
        let list = [...(transactions || [])];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (scope === 'this_month') {
            list = list.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
        } else if (scope === 'expense') {
            list = list.filter(t => t.type === 'expense');
        } else if (scope === 'income') {
            list = list.filter(t => t.type === 'income');
        }

        return list;
    };

    const handleDownload = () => {
        const filtered = getFilteredTransactions();
        const timestamp = new Date().toISOString().split('T')[0];
        const scopeLabel = scope === 'this_month' ? 'Current Month' : scope === 'expense' ? 'Expenses' : scope === 'income' ? 'Income' : 'Complete Ledger';

        if (format === 'csv') {
            exportToCSV(filtered, `finance_ledger_${timestamp}.csv`);
        } else if (format === 'excel') {
            exportToExcel(filtered, `finance_ledger_${timestamp}.xls`);
        } else if (format === 'pdf') {
            printPDFStatement(filtered, user, scopeLabel);
        }

        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel animate-fade-in" style={{ width: '440px', padding: '30px', background: 'var(--bg-secondary)' }}>
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px' }}>
                            <Download size={20} color="var(--accent-color)" />
                        </div>
                        <h3 style={{ margin: 0 }}>Export Statements</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="form-group">
                    <label className="form-label">Select Format</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={() => setFormat('pdf')}
                            style={{
                                padding: '14px 10px',
                                borderRadius: '10px',
                                background: format === 'pdf' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${format === 'pdf' ? 'var(--accent-color)' : 'var(--glass-border)'}`,
                                color: format === 'pdf' ? '#fff' : 'var(--text-secondary)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <FileText size={22} color={format === 'pdf' ? 'var(--accent-color)' : '#94a3b8'} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>PDF Statement</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFormat('excel')}
                            style={{
                                padding: '14px 10px',
                                borderRadius: '10px',
                                background: format === 'excel' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${format === 'excel' ? 'var(--success)' : 'var(--glass-border)'}`,
                                color: format === 'excel' ? '#fff' : 'var(--text-secondary)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <FileSpreadsheet size={22} color={format === 'excel' ? 'var(--success)' : '#94a3b8'} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Excel (.xls)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFormat('csv')}
                            style={{
                                padding: '14px 10px',
                                borderRadius: '10px',
                                background: format === 'csv' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                border: `1px solid ${format === 'csv' ? 'var(--warning)' : 'var(--glass-border)'}`,
                                color: format === 'csv' ? '#fff' : 'var(--text-secondary)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={22} color={format === 'csv' ? 'var(--warning)' : '#94a3b8'} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>CSV Data</span>
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Data Scope</label>
                    <select
                        className="form-input"
                        value={scope}
                        onChange={e => setScope(e.target.value)}
                    >
                        <option value="all">All Records ({transactions?.length || 0} transactions)</option>
                        <option value="this_month">Current Month Only</option>
                        <option value="expense">Expenses Only</option>
                        <option value="income">Income Only</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '26px' }}>
                    <button className="btn btn-primary" onClick={handleDownload} style={{ flex: 1 }}>
                        <Download size={18} /> Generate & Download
                    </button>
                    <button className="btn" style={{ background: 'rgba(255,255,255,0.06)' }} onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
