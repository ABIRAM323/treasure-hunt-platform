import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin() {
    const { adminLogin } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await adminLogin(username, password);
            navigate('/admin');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid admin credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-center">
            <div className="login-bg-admin" aria-hidden="true" />
            <div className="animate-slide-up" style={{ width: '100%', maxWidth: '420px' }}>
                <div className="text-center" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '2.8rem', display: 'block', marginBottom: '0.5rem', color: 'var(--neon-purple)', textShadow: '0 0 20px rgba(184,77,255,0.7)', animation: 'float 3s ease-in-out infinite' }}>⚙</div>
                    <h1 style={{ color: 'var(--neon-purple)', fontSize: '1.6rem', fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>ADMIN PORTAL</h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.18em', marginTop: '0.25rem' }}>RESTRICTED ACCESS</p>
                </div>

                <div className="card" style={{ borderColor: 'rgba(184,77,255,0.3)', boxShadow: '0 0 30px rgba(184,77,255,0.15)' }}>
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Administrator Login</h2>
                    <p style={{ marginBottom: '1.75rem', fontSize: '0.85rem' }}>Authorized personnel only</p>

                    {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>⚠️ {error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="uname" style={{ color: 'var(--neon-purple)' }}>Username</label>
                            <input
                                id="uname"
                                className="form-input"
                                style={{ '--input-focus-color': 'var(--neon-purple)' }}
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="admin"
                                required
                                autoComplete="username"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="apassword" style={{ color: 'var(--neon-purple)' }}>Password</label>
                            <input
                                id="apassword"
                                className="form-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Admin password"
                                required
                                autoComplete="current-password"
                            />
                        </div>
                        <button className="btn btn-purple btn-lg w-full" type="submit" disabled={loading}>
                            {loading ? (
                                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Verifying…</>
                            ) : '→ Access Dashboard'}
                        </button>
                    </form>

                    <div className="divider" />
                    <div className="text-center">
                        <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>← Back to Team Login</Link>
                    </div>
                </div>
            </div>

            <style>{`
        .login-bg-admin { position: fixed; inset: 0; pointer-events: none; z-index: -1;
          background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(184,77,255,0.07) 0%, transparent 70%); }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
        </div>
    );
}
