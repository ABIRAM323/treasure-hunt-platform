import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function AdminLogin() {
    const { adminLogin } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await adminLogin(form.username, form.password);
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid admin credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-center" style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: '1.5rem 1rem' }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                {/* Logo */}
                <div className="text-center animate-slide-up" style={{ marginBottom: '2.5rem' }}>
                    <img
                        src="/astral-logo.png"
                        alt="Logo"
                        style={{ width: '100px', height: '100px', objectFit: 'contain', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 15px rgba(255, 0, 0, 0.7)) hue-rotate(340deg)' }}
                    />
                    <h1 className="stranger-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '0.25rem' }}>
                        ADMIN ACCESS
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--neon-green)', letterSpacing: '0.2em', marginTop: '0.5rem', opacity: 0.8 }}>
                        RESTRICTED — ORGANIZERS ONLY
                    </p>
                </div>

                {/* Login Card */}
                <div className="card animate-fade-in" style={{ borderColor: 'rgba(184,77,255,0.3)', boxShadow: '0 0 30px rgba(184,77,255,0.1)' }}>
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Admin Login</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                        Control the hunt, view scores, manage teams.
                    </p>

                    {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="username">Username</label>
                            <input
                                id="username"
                                className="form-input"
                                type="text"
                                value={form.username}
                                onChange={set('username')}
                                placeholder="admin"
                                required
                                autoComplete="username"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="admin-password">Password</label>
                            <input
                                id="admin-password"
                                className="form-input"
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                placeholder="Admin password"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="btn w-full" style={{ marginTop: '0.5rem', background: 'linear-gradient(135deg,#660099,#b84dff)', color: '#fff' }} disabled={loading}>
                            {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff' }} /> Verifying…</> : '→ Access Control Panel'}
                        </button>
                    </form>
                </div>

                <div className="text-center" style={{ marginTop: '1.5rem' }}>
                    <Link to="/login" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ← Back to Team Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
