import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CountdownTimer from './CountdownTimer';

export default function Navbar({ title }) {
    const { user, logout, isAdmin, isTeam } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Link to={isAdmin ? '/admin' : isTeam ? '/dashboard' : '/'} className="navbar-brand">
                    ⬡ TREASURE HUNT
                </Link>
                {title && (
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        / {title}
                    </span>
                )}
            </div>

            <div className="navbar-nav">
                <CountdownTimer />
                {isTeam && (
                    <Link to="/leaderboard" className="btn btn-ghost btn-sm hidden-mobile">
                        Leaderboard
                    </Link>
                )}
                {isAdmin && (
                    <Link to="/leaderboard" className="btn btn-ghost btn-sm hidden-mobile" target="_blank">
                        Leaderboard
                    </Link>
                )}
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            color: isAdmin ? 'var(--neon-purple)' : 'var(--neon-green)',
                            padding: '0.3rem 0.75rem',
                            border: `1px solid ${isAdmin ? 'rgba(184,77,255,0.3)' : 'rgba(0,255,136,0.3)'}`,
                            borderRadius: 'var(--radius-sm)',
                            background: isAdmin ? 'rgba(184,77,255,0.08)' : 'rgba(0,255,136,0.08)',
                        }}>
                            {isAdmin ? '⚙ ADMIN' : `🏷 ${user.teamId || user.name}`}
                        </span>
                        <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
