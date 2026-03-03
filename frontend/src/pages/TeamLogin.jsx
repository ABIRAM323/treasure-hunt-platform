import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function TeamLogin() {
    const { teamLogin } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ teamId: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await teamLogin(form.teamId.toUpperCase(), form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-center" style={{ background: 'var(--bg-primary)', minHeight: '100vh', padding: '1.5rem 1rem' }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center animate-slide-up" style={{ marginBottom: '2.5rem' }}>
                    <img
                        src="/astral-logo.png"
                        alt="ASTRAL Logo"
                        style={{ width: '120px', height: '120px', objectFit: 'contain', marginBottom: '1rem', filter: 'drop-shadow(0 0 15px rgba(255, 0, 0, 0.6)) hue-rotate(340deg)' }}
                    />
                    <div className="stranger-logo-wrap" style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}>
                        <div className="logo-bar logo-bar-top"></div>
                        <div className="stranger-logo" style={{ fontSize: '2.5rem' }}>
                            <span className="side-letter">A</span>
                            <span className="center-text">STRA</span>
                            <span className="side-letter">L</span>
                        </div>
                        <div className="logo-bar logo-bar-bottom"></div>
                    </div>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--neon-green)', letterSpacing: '0.3em', textTransform: 'uppercase', opacity: 0.8, marginTop: '1rem' }}>
                        TREASURE HUNT
                    </p>
                </div>

                {/* Login Card */}
                <div className="card card-neon animate-fade-in">
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Team Login</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
                        Enter your Team ID and password to begin.
                    </p>

                    {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="teamId">Team ID</label>
                            <input
                                id="teamId"
                                className="form-input"
                                type="text"
                                value={form.teamId}
                                onChange={set('teamId')}
                                placeholder="e.g. TEAM01"
                                required
                                autoComplete="username"
                                autoCapitalize="characters"
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                className="form-input"
                                type="password"
                                value={form.password}
                                onChange={set('password')}
                                placeholder="Team password"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: '0.5rem' }}>
                            {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Verifying…</> : '→ Enter Hunt'}
                        </button>
                    </form>
                </div>

                <div className="text-center" style={{ marginTop: '1.5rem' }}>
                    <Link to="/leaderboard" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        🏆 View Leaderboard
                    </Link>
                    <span style={{ color: 'var(--text-muted)', margin: '0 0.75rem' }}>·</span>
                    <Link to="/admin/login" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        ⚙ Admin
                    </Link>
                </div>
            </div>
        </div>
    );
}
