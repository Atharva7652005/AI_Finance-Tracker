import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, WalletCards, PieChart, Sparkles, Target, Repeat } from 'lucide-react';

const Sidebar = () => {
    return (
        <aside className="app-sidebar" style={{
            width: '260px',
            height: '100vh',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--glass-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 0',
            flexShrink: 0
        }}>
            <div className="sidebar-logo" style={{ padding: '0 24px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                    padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center'
                }}>
                    <Sparkles size={20} color="white" />
                </div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>AI Finance</h2>
            </div>
            
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
                <NavLink to="/" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                    <LayoutDashboard size={20} /> Dashboard
                </NavLink>
                <NavLink to="/transactions" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                    <WalletCards size={20} /> Transactions
                </NavLink>
                <NavLink to="/goals" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Target size={20} /> Goals & Savings
                </NavLink>
                <NavLink to="/subscriptions" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                    <Repeat size={20} /> Subscriptions
                </NavLink>
                <NavLink to="/reports" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
                    <PieChart size={20} /> Reports
                </NavLink>
            </nav>

            <style>{`
                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    border-radius: 10px;
                    transition: var(--transition);
                    font-weight: 500;
                }
                .nav-link:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-primary);
                }
                .nav-link.active {
                    background: rgba(99, 102, 241, 0.15);
                    color: var(--accent-color);
                }
            `}</style>
        </aside>
    );
};

export default Sidebar;
