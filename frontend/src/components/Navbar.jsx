import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CountdownTimer from './CountdownTimer';

export default function Navbar({ title }) {
    const { user, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setMenuOpen(false);
    };

    return (
        <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
            {/* Left: brand */}
            <Link to={isAdmin ? '/admin' : '/dashboard'} style={{ textDecoration: 'none' }}>
                <span className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/astral-logo.png" alt="logo" style={{ height: '28px', width: 'auto', filter: 'drop-shadow(0 0 10px rgba(255,15,15,0.8))' }} />
                    ASTRAL
                </span>
            </Link>

            {/* Centre: timer (hidden on very small screens) */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <CountdownTimer large={false} />
            </div>

            {/* Right: desktop nav */}
            <div className="navbar-nav hidden-mobile-flex">
                <Link to="/leaderboard" className="btn btn-ghost btn-sm">🏆 Board</Link>
                {user && (
                    <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                        color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {isAdmin ? '⚙ Admin' : user.name || user.teamId}
                    </span>
                )}
                {user && (
                    <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
                )}
            </div>

            {/* Right: hamburger button (mobile only) */}
            <button
                className="hamburger"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu"
                style={{
                    display: 'none',          // shown via CSS media query below
                    background: 'none',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 0.6rem',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                }}
            >
                {menuOpen ? '✕' : '☰'}
            </button>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'rgba(5,5,16,0.97)', borderBottom: '1px solid var(--border-subtle)',
                    backdropFilter: 'blur(20px)', padding: '1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.75rem',
                    zIndex: 99,
                }}>
                    {user && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--neon-green)', marginBottom: '0.25rem' }}>
                            {isAdmin ? '⚙ Admin' : `👤 ${user.name || user.teamId}`}
                        </div>
                    )}
                    <Link to="/leaderboard" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)} style={{ justifyContent: 'flex-start' }}>
                        🏆 Leaderboard
                    </Link>
                    {!isAdmin && (
                        <Link to="/dashboard" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)} style={{ justifyContent: 'flex-start' }}>
                            🗺 My Clue
                        </Link>
                    )}
                    {isAdmin && (
                        <Link to="/admin" className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)} style={{ justifyContent: 'flex-start' }}>
                            ⚙ Admin Panel
                        </Link>
                    )}
                    {user && (
                        <button className="btn btn-danger btn-sm" onClick={handleLogout} style={{ justifyContent: 'flex-start' }}>
                            ⏻ Logout
                        </button>
                    )}
                </div>
            )}

            <style>{`
        @media (max-width: 768px) {
          .hamburger { display: flex !important; align-items: center; }
          .hidden-mobile-flex { display: none !important; }
        }
        @media (min-width: 769px) {
          .hidden-mobile-flex { display: flex; }
        }
      `}</style>
        </nav>
    );
}
