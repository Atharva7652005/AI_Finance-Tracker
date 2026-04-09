import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register } = useContext(AuthContext);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(name, email, password);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div style={{
            display: 'flex', height: '100vh', width: '100vw',
            alignItems: 'center', justifyContent: 'center',
            position: 'absolute', top: 0, left: 0,
            background: 'var(--bg-primary)'
        }}>
            <div className="glass-panel animate-fade-in" style={{ width: '400px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        display: 'inline-flex', background: 'var(--accent-color)',
                        padding: '12px', borderRadius: '12px', marginBottom: '16px'
                    }}>
                        <Sparkles size={28} color="white" />
                    </div>
                    <h2>Create Account</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Join AI Finance today</p>
                </div>

                {error && <div style={{ color: 'var(--danger)', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Sign Up</button>
                    
                    <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
                        Already have an account? <Link to="/login">Sign In</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;
