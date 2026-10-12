import React, { useState, useRef } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/format';
import { 
    Scan, Upload, Sparkles, CheckCircle2, AlertCircle, 
    X, FileText, RefreshCw
} from 'lucide-react';

const ReceiptScannerModal = ({ isOpen, onClose, onTransactionSaved }) => {
    const [fileData, setFileData] = useState(null); // { base64, mimeType, name, previewUrl }
    const [scanning, setScanning] = useState(false);
    const [scannedResult, setScannedResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [dragActive, setDragActive] = useState(false);

    // Form fields for editing/verifying extracted data
    const [formData, setFormData] = useState({
        merchant: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Food & Dining',
        paymentMethod: 'UPI',
        notes: '',
        lineItems: []
    });

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const processFile = (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setErrorMsg('Please upload a valid image (JPG, PNG, WebP) or PDF file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setErrorMsg('File size exceeds 10MB limit.');
            return;
        }

        setErrorMsg('');
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result;
            setFileData({
                base64,
                mimeType: file.type,
                name: file.name,
                previewUrl: file.type.startsWith('image/') ? base64 : null
            });
            setScannedResult(null);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => {
        setDragActive(false);
    };

    const handleScan = async () => {
        if (!fileData) return;
        setScanning(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const res = await api.post('/api/receipts/scan', {
                imageBase64: fileData.base64,
                mimeType: fileData.mimeType
            });

            const data = res.data.data;
            setScannedResult(data);
            setFormData({
                merchant: data.merchant || '',
                amount: data.amount ? String(data.amount) : '',
                date: data.date || new Date().toISOString().split('T')[0],
                category: data.category || 'Food & Dining',
                paymentMethod: data.paymentMethod || 'UPI',
                notes: data.notes || '',
                lineItems: data.lineItems || []
            });
            setSuccessMsg(`Parsed successfully with ${data.engine}!`);
        } catch (err) {
            console.error('Scan error:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to scan receipt. Please verify image clarity and API keys.');
        } finally {
            setScanning(false);
        }
    };

    const handleSaveTransaction = async (e) => {
        e.preventDefault();
        const numAmount = Number(formData.amount);
        if (!numAmount || numAmount <= 0) {
            setErrorMsg('Please enter a valid positive amount.');
            return;
        }

        setSaving(true);
        setErrorMsg('');
        try {
            const notesWithMerchant = formData.merchant 
                ? `[Scanned Receipt: ${formData.merchant}] ${formData.notes || ''}`.trim()
                : (formData.notes || 'Scanned Receipt');

            await api.post('/api/transactions', {
                amount: numAmount,
                type: 'expense',
                category: formData.category,
                date: formData.date,
                notes: notesWithMerchant
            });

            if (onTransactionSaved) {
                onTransactionSaved();
            }
            onClose();
        } catch (err) {
            console.error('Save error:', err);
            setErrorMsg(err.response?.data?.message || 'Failed to save transaction.');
        } finally {
            setSaving(false);
        }
    };

    const resetScan = () => {
        setFileData(null);
        setScannedResult(null);
        setErrorMsg('');
        setSuccessMsg('');
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.82)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div className="glass-panel animate-fade-in" style={{
                width: '92%', maxWidth: scannedResult ? '860px' : '560px',
                maxHeight: '90vh', overflowY: 'auto', padding: '28px',
                transition: 'all 0.3s ease'
            }}>
                {/* Header */}
                <div className="flex-between" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, var(--accent-color), #ec4899)',
                            padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center'
                        }}>
                            <Scan size={22} color="white" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                AI Smart Receipt Scanner
                                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-color)' }}>
                                    Gemini Vision
                                </span>
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Upload receipt or invoice to extract amount, merchant, date & line items.
                            </p>
                        </div>
                    </div>

                    <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px', borderRadius: '50%' }}
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Notifications */}
                {errorMsg && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                        background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'
                    }}>
                        <AlertCircle size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {successMsg && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                        background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'
                    }}>
                        <CheckCircle2 size={18} />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* STEP 1: UPLOAD AREA (If not scanned yet) */}
                {!scannedResult && (
                    <div>
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: dragActive ? '2px dashed var(--accent-color)' : '2px dashed rgba(255, 255, 255, 0.18)',
                                borderRadius: '16px',
                                padding: fileData ? '24px' : '44px 20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: dragActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                transition: 'var(--transition)',
                                marginBottom: '20px'
                            }}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                style={{ display: 'none' }} 
                                accept="image/*,application/pdf"
                                onChange={(e) => processFile(e.target.files[0])}
                            />

                            {fileData ? (
                                <div>
                                    {fileData.previewUrl ? (
                                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                                            <img 
                                                src={fileData.previewUrl} 
                                                alt="Receipt preview" 
                                                style={{ maxWidth: '240px', maxHeight: '200px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
                                            <FileText size={40} color="var(--accent-color)" />
                                        </div>
                                    )}
                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{fileData.name}</p>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Click to change file</span>
                                </div>
                            ) : (
                                <div>
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '50%',
                                        background: 'rgba(99, 102, 241, 0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px'
                                    }}>
                                        <Upload size={26} color="var(--accent-color)" />
                                    </div>
                                    <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: '1rem' }}>
                                        Drag & drop your receipt or <span style={{ color: 'var(--accent-color)' }}>browse</span>
                                    </p>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        Supports JPG, PNG, WebP photos & PDF invoices up to 10MB
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Scan Trigger Button */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={onClose} disabled={scanning}>
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={handleScan}
                                disabled={!fileData || scanning}
                                style={{ minWidth: '160px' }}
                            >
                                {scanning ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Scanning with Gemini...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} /> Scan with AI
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: VERIFICATION & APPROVAL WORKSPACE (Side-by-Side) */}
                {scannedResult && (
                    <div className="animate-fade-in">
                        <div className="grid-2" style={{ gap: '24px', alignItems: 'start', marginBottom: '24px' }}>
                            {/* Left: Receipt Preview */}
                            <div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                                    Receipt Image
                                </span>
                                <div style={{
                                    padding: '12px', borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    textAlign: 'center'
                                }}>
                                    {fileData?.previewUrl ? (
                                        <img 
                                            src={fileData.previewUrl} 
                                            alt="Receipt" 
                                            style={{ width: '100%', maxHeight: '340px', objectFit: 'contain', borderRadius: '8px' }}
                                        />
                                    ) : (
                                        <div style={{ padding: '60px 0', color: 'var(--text-secondary)' }}>
                                            <FileText size={48} style={{ margin: '0 auto 8px', display: 'block' }} />
                                            <span>PDF Document ({fileData?.name})</span>
                                        </div>
                                    )}
                                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                            onClick={resetScan}
                                        >
                                            <RefreshCw size={12} /> Scan Another Receipt
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Extracted Editable Fields */}
                            <form onSubmit={handleSaveTransaction}>
                                <div className="form-group" style={{ marginBottom: '14px' }}>
                                    <label className="form-label">Merchant / Store Name *</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        required
                                        placeholder="e.g. Starbucks, Swiggy, DMart"
                                        value={formData.merchant}
                                        onChange={e => setFormData({ ...formData, merchant: e.target.value })}
                                    />
                                </div>

                                <div className="grid-2" style={{ marginBottom: '14px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Amount (₹) *</label>
                                        <input 
                                            type="number" 
                                            min="0.01" 
                                            step="0.01"
                                            className="form-input" 
                                            required
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Date *</label>
                                        <input 
                                            type="date" 
                                            className="form-input" 
                                            required
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid-2" style={{ marginBottom: '14px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <select 
                                            className="form-select"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        >
                                            <option value="Food & Dining">Food & Dining</option>
                                            <option value="Groceries">Groceries</option>
                                            <option value="Travel & Fuel">Travel & Fuel</option>
                                            <option value="Shopping">Shopping</option>
                                            <option value="Utilities & Bills">Utilities & Bills</option>
                                            <option value="Entertainment">Entertainment</option>
                                            <option value="Healthcare">Healthcare</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Payment Method</label>
                                        <select 
                                            className="form-select"
                                            value={formData.paymentMethod}
                                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        >
                                            <option value="UPI">UPI</option>
                                            <option value="Card">Card</option>
                                            <option value="Cash">Cash</option>
                                            <option value="NetBanking">NetBanking</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Line Items Table if extracted */}
                                {formData.lineItems && formData.lineItems.length > 0 && (
                                    <div style={{ marginBottom: '14px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                                            Itemized Breakdown ({formData.lineItems.length} items)
                                        </span>
                                        <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                                            {formData.lineItems.map((item, idx) => (
                                                <div key={idx} className="flex-between" style={{ fontSize: '0.8rem', padding: '3px 0' }}>
                                                    <span>{item.name} {item.quantity > 1 && `(x${item.quantity})`}</span>
                                                    <strong>{formatCurrency(item.price)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">Notes</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Add notes..."
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-secondary" onClick={resetScan}>
                                        Back
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>Saving...</>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} /> Approve & Save Transaction
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceiptScannerModal;
