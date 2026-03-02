import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TeamLogin() {
    const { teamLogin } = useAuth();
    const navigate = useNavigate();
    const [teamId, setTeamId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await teamLogin(teamId.trim().toUpperCase(), password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-center">
            {/* Background particles */}
            <div className="login-bg" aria-hidden="true" />

            <div className="animate-slide-up" style={{ width: '100%', maxWidth: '440px' }}>
                {/* Logo */}
                <div className="text-center" style={{ marginBottom: '2.5rem' }}>
                    <div className="login-icon animate-float">⬡</div>
                    <h1 className="text-neon" style={{ fontSize: '1.8rem', letterSpacing: '0.12em' }}>
                        TECH FEST
                    </h1>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--neon-cyan)', letterSpacing: '0.2em', marginTop: '0.25rem' }}>
                        TREASURE HUNT 2024
                    </p>
                </div>

                <div className="card card-neon">
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Team Login</h2>
                    <p style={{ marginBottom: '1.75rem', fontSize: '0.85rem' }}>Enter your assigned Team ID and password</p>

                    {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>⚠️ {error}</div>}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="teamId">Team ID</label>
                            <input
                                id="teamId"
                                className="form-input"
                                type="text"
                                value={teamId}
                                onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                                placeholder="e.g. TEAM01"
                                required
                                autoComplete="username"
                                spellCheck={false}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">Password</label>
                            <input
                                id="password"
                                className="form-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Team password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                            {loading ? (
                                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Authenticating…</>
                            ) : (
                                '→ Enter the Hunt'
                            )}
                        </button>
                    </form>

                    <div className="divider" />
                    <div className="text-center">
                        <Link to="/leaderboard" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            View Live Leaderboard
                        </Link>
                        <span style={{ color: 'var(--text-muted)', margin: '0 0.75rem' }}>·</span>
                        <Link to="/admin/login" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Admin Login
                        </Link>
                    </div>
                </div>
            </div>

            <style>{`
        .login-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: -1;
          background:
            radial-gradient(ellipse 60% 50% at 20% 80%, rgba(0,229,255,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 20%, rgba(184,77,255,0.06) 0%, transparent 60%);
        }
        .login-icon {
          font-size: 3rem; display: block; margin-bottom: 0.5rem;
          color: var(--neon-green); text-shadow: 0 0 20px rgba(0,255,136,0.7);
        }
      `}</style>
        </div>
    );
}
