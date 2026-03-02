import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import CountdownTimer from '../components/CountdownTimer';
import api from '../utils/api';

const STATUS_BADGE = {
    waiting: { cls: 'badge-muted', label: 'Waiting' },
    searching: { cls: 'badge-green', label: 'Searching' },
    completed: { cls: 'badge-cyan', label: 'Completed' },
    final: { cls: 'badge-purple', label: 'Final Boss' },
    finished: { cls: 'badge-yellow', label: '🏆 Finished' },
};

export default function LeaderboardPage() {
    const { leaderboard: liveLeaderboard } = useSocket();
    const [board, setBoard] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial load from REST
    useEffect(() => {
        api.get('/leaderboard')
            .then(({ data }) => {
                setBoard(data.leaderboard || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    // Real-time updates from socket
    useEffect(() => {
        if (liveLeaderboard && liveLeaderboard.length > 0) {
            const enriched = liveLeaderboard.map((t, idx) => ({
                rank: idx + 1,
                ...t,
                cluesCompleted: t.currentClueIndex || 0,
            }));
            setBoard(enriched);
        }
    }, [liveLeaderboard]);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid var(--border-subtle)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <Link to="/" style={{ fontFamily: 'var(--font-display)', color: 'var(--neon-green)', fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.08em', textShadow: '0 0 15px rgba(0,255,136,0.5)' }}>
                    ⬡ TREASURE HUNT
                </Link>
                <CountdownTimer large={false} />
            </div>

            <div className="container" style={{ padding: '2rem 1.5rem' }}>
                {/* Title */}
                <div className="text-center animate-slide-up" style={{ marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem', animation: 'float 3s ease-in-out infinite' }}>🏆</div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--neon-yellow)', textShadow: '0 0 20px rgba(255,224,0,0.4)' }}>
                        LIVE LEADERBOARD
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                        Updates in real-time · <span style={{ color: 'var(--neon-green)' }}>●</span> LIVE
                    </p>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                        <div className="spinner" />
                    </div>
                ) : board.length === 0 ? (
                    <div className="card text-center" style={{ padding: '3rem' }}>
                        <p>No teams yet. The hunt hasn't started!</p>
                    </div>
                ) : (
                    <>
                        {/* Top 3 podium */}
                        {board.length >= 1 && (
                            <div className="podium animate-fade-in">
                                {[1, 0, 2].map((idx) => {
                                    const team = board[idx];
                                    if (!team) return <div key={idx} />;
                                    const podiumData = [
                                        { height: '130px', color: 'var(--neon-yellow)', label: '🥇 1st', size: '1.2rem' },
                                        { height: '160px', color: 'var(--neon-yellow)', label: '🥇 1st', size: '1.4rem' },
                                        { height: '110px', color: '#cd7f32', label: '🥉 3rd', size: '1rem' },
                                    ];
                                    const medals = ['🥈', '🥇', '🥉'];
                                    const p = podiumData[idx + 1 === 1 ? 1 : idx === 0 ? 0 : 2];
                                    return (
                                        <div key={idx} className="podium-item" style={{ '--h': p.height }}>
                                            <div className="podium-medal">{medals[idx]}</div>
                                            <div className="podium-name">{team.name}</div>
                                            <div className="podium-score" style={{ color: 'var(--neon-yellow)' }}>{team.score}</div>
                                            <div className="podium-block" />
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Full table */}
                        <div className="card" style={{ marginTop: '2rem' }}>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Team</th>
                                            <th>Score</th>
                                            <th>Clues</th>
                                            <th>Status</th>
                                            <th className="hidden-mobile">Last Location</th>
                                            <th className="hidden-mobile">Members</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {board.map((team, idx) => (
                                            <tr key={team.teamId || idx}>
                                                <td>
                                                    <span style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontSize: '1.1rem',
                                                        color: idx === 0 ? 'var(--neon-yellow)' : idx === 1 ? '#ccc' : idx === 2 ? '#cd7f32' : 'var(--text-muted)',
                                                    }}>
                                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontSize: '0.9rem' }}>{team.name}</div>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{team.teamId}</div>
                                                </td>
                                                <td>
                                                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--neon-green)', fontSize: '1.1rem' }}>
                                                        {team.score}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{ fontFamily: 'var(--font-mono)' }}>
                                                        {team.cluesCompleted || 0} / {team.totalClues || '—'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${(STATUS_BADGE[team.status] || STATUS_BADGE.waiting).cls}`}>
                                                        {(STATUS_BADGE[team.status] || STATUS_BADGE.waiting).label}
                                                    </span>
                                                </td>
                                                <td className="hidden-mobile">{team.lastLocation || '—'}</td>
                                                <td className="hidden-mobile" style={{ fontSize: '0.8rem' }}>
                                                    {team.members ? team.members.map((m) => m.name || m).join(', ') : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
        .podium { display: flex; justify-content: center; align-items: flex-end; gap: 1rem; padding: 1rem; }
        .podium-item { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; width: 140px; }
        .podium-medal { font-size: 2rem; }
        .podium-name { font-family: var(--font-display); font-size: 0.85rem; color: var(--text-primary); text-align: center; }
        .podium-score { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; }
        .podium-block { width: 100%; height: var(--h); background: linear-gradient(180deg,rgba(0,255,136,0.15),rgba(0,255,136,0.05)); border: 1px solid var(--border-glow); border-radius: var(--radius-md) var(--radius-md) 0 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>
        </div>
    );
}
