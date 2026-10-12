import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[Browser Error Boundary]', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-primary, #0c0c14)',
                    color: '#ffffff',
                    padding: '20px'
                }}>
                    <div className="glass-panel" style={{
                        maxWidth: '480px',
                        width: '100%',
                        padding: '36px',
                        textAlign: 'center',
                        borderRadius: '16px',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(23, 23, 35, 0.85)'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <AlertCircle size={28} color="var(--danger, #ef4444)" />
                        </div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>Something went wrong</h2>
                        <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', marginBottom: '24px' }}>
                            An unexpected UI error occurred. Please refresh the page to continue.
                        </p>
                        <button 
                            className="btn btn-primary"
                            onClick={this.handleReload}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                        >
                            <RefreshCw size={16} /> Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
