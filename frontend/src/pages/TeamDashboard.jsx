import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import ProgressBar from '../components/ProgressBar';
import QRScanner from '../components/QRScanner';

const TYPE_COLORS = { physical: 'cyan', technical: 'green', final: 'purple' };
const TYPE_LABELS = { physical: '📍 Physical Clue', technical: '💻 Technical Clue', final: '🏆 Final Boss' };
const DIFF_BADGE = { easy: 'badge-green', medium: 'badge-yellow', hard: 'badge-orange', boss: 'badge-pink' };

function ClueTimer({ startTime, isFinished }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime || isFinished) return;

        const start = new Date(startTime).getTime();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime, isFinished]);

    if (!startTime || isFinished) return null;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--neon-cyan)', textShadow: '0 0 10px rgba(0,255,255,0.3)' }}>
            {formatTime(elapsed)}
        </div>
    );
}

export default function TeamDashboard() {
    const { user } = useAuth();
    const { eventState } = useSocket();
    const navigate = useNavigate();

    const [clueData, setClueData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answer, setAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }
    const [showQR, setShowQR] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const fetchClue = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/game/current-clue');
            setClueData(data);
            setAttempts(data.attemptCount || 0);
            setAnswer('');
            setFeedback(null);
            setShowQR(false);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchClue(); }, [fetchClue]);

    const handleAnswerSubmit = async (e) => {
        e.preventDefault();
        if (!answer.trim()) return;
        setSubmitting(true);
        setFeedback(null);
        try {
            const { data } = await api.post('/game/submit-answer', { answer: answer.trim() });
            if (data.correct) {
                setFeedback({ type: 'success', msg: data.message });
                setTimeout(() => fetchClue(), 1800);
            } else {
                setAttempts((a) => a + 1);
                setFeedback({ type: 'error', msg: data.message });
            }
        } catch (err) {
            setFeedback({ type: 'error', msg: err.response?.data?.message || 'Submission failed' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleQRSuccess = () => {
        setFeedback({ type: 'success', msg: '✅ QR Verified! Loading next clue…' });
        setTimeout(() => fetchClue(), 2000);
    };

    if (loading) return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar title="Dashboard" />
            <div className="page-center" style={{ minHeight: 'calc(100vh - 70px)' }}>
                <div className="spinner" />
            </div>
        </div>
    );

    const { clue, progress, score, status, finished, locked } = clueData || {};

    return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar title="Dashboard" />

            <div className="container page-content">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                        <h1 className="stranger-title" style={{ fontSize: '1.8rem', letterSpacing: '0.05em' }}>
                            Welcome, <span className="text-neon">{user?.name}</span>
                        </h1>
                        <p style={{ marginTop: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            Team ID: <span style={{ color: 'var(--neon-cyan)' }}>{user?.teamId}</span>
                        </p>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clue Timer</div>
                                <ClueTimer startTime={clueData?.clueStartTime} isFinished={finished} />
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1rem' }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--neon-yellow)', textShadow: '0 0 15px rgba(255,224,0,0.4)', lineHeight: 1 }}>
                                    {score || 0}
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>points</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                {progress && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <ProgressBar
                            label="Hunt Progress"
                            completed={progress.completed}
                            total={progress.total}
                            color={TYPE_COLORS[clue?.type] || 'green'}
                        />
                    </div>
                )}

                {/* Event locked */}
                {(eventState.isLocked || locked) && (
                    <div className="card card-neon animate-fade-in" style={{ borderColor: 'rgba(255,45,126,0.4)', textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                        <h2 className="text-pink">Event Ended</h2>
                        <p style={{ marginTop: '0.75rem' }}>The treasure hunt has concluded. Check the leaderboard for results!</p>
                        <a href="/leaderboard" className="btn btn-secondary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>View Leaderboard</a>
                    </div>
                )}

                {/* Finished */}
                {!eventState.isLocked && finished && (
                    <div className="card animate-fade-in" style={{ borderColor: 'rgba(0,255,136,0.4)', textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏆</div>
                        <h2 className="text-neon">Hunt Complete!</h2>
                        <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>You've completed all clues! Final score:</p>
                        <div style={{ fontSize: '3rem', fontFamily: 'var(--font-display)', color: 'var(--neon-yellow)', margin: '1rem 0' }}>{score}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>+ 500 Final Boss Bonus awarded!</div>
                    </div>
                )}

                {/* Current Clue Card */}
                {!finished && !eventState.isLocked && clue && (
                    <div className="card card-neon animate-slide-up">
                        {/* Clue Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div>
                                <span className={`badge badge-${TYPE_COLORS[clue.type] === 'cyan' ? 'cyan' : TYPE_COLORS[clue.type] === 'purple' ? 'purple' : 'green'}`}>
                                    {TYPE_LABELS[clue.type]}
                                </span>
                                <h2 style={{ marginTop: '0.75rem' }}>{clue.title}</h2>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span className={`badge ${DIFF_BADGE[clue.difficulty]}`}>{clue.difficulty}</span>
                                <span className="badge badge-muted">{clue.points} pts</span>
                            </div>
                        </div>

                        {/* Clue Text */}
                        <div style={{
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '1.5rem',
                            fontFamily: 'var(--font-body)', lineHeight: '1.8', color: 'var(--text-primary)', fontSize: '1.05rem',
                        }}>
                            {clue.clueText}
                            {clue.mediaType === 'image' && clue.mediaUrl && (
                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                    <img
                                        src={clue.mediaUrl.startsWith('/uploads') ? (import.meta.env.VITE_API_URL || '') + clue.mediaUrl : clue.mediaUrl}
                                        alt="Clue Media"
                                        style={{ maxWidth: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                                    />
                                </div>
                            )}
                            {clue.mediaType === 'audio' && clue.mediaUrl && (
                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                    <audio
                                        controls
                                        style={{ width: '100%', maxWidth: '400px' }}
                                        src={clue.mediaUrl.startsWith('/uploads') ? (import.meta.env.VITE_API_URL || '') + clue.mediaUrl : clue.mediaUrl}
                                    >
                                        Your browser does not support the audio element.
                                    </audio>
                                </div>
                            )}
                            {clue.mediaType === 'video' && clue.mediaUrl && (
                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                    <video
                                        controls
                                        style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                                        src={clue.mediaUrl.startsWith('/uploads') ? (import.meta.env.VITE_API_URL || '') + clue.mediaUrl : clue.mediaUrl}
                                    >
                                        Your browser does not support the video element.
                                    </video>
                                </div>
                            )}
                        </div>

                        {/* Location (physical) */}
                        {clue.locationName && (
                            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                                📍 Location: <strong>{clue.locationName}</strong>
                            </div>
                        )}

                        {/* Hint (after 3 wrong attempts) */}
                        {clue.hint && (
                            <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                                💡 Hint: {clue.hint}
                            </div>
                        )}

                        {/* Attempts counter */}
                        {attempts > 0 && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--neon-orange)', marginBottom: '1rem' }}>
                                ⚠️ Wrong attempts: {attempts} (−{attempts * 15} pts penalty)
                            </div>
                        )}

                        {/* Feedback */}
                        {feedback && (
                            <div className={`alert ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
                                {feedback.msg}
                            </div>
                        )}

                        {/* Action Area */}
                        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {clue.type === 'physical' && clue.hasQR !== false ? (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Navigate to the location and scan the QR code to proceed.
                                </p>
                            ) : null}

                            {/* Render Text Form for Tech/Final or Physical without QR */}
                            {(clue.type === 'technical' || clue.type === 'final' || (clue.type === 'physical' && clue.hasQR === false)) && (
                                <form onSubmit={handleAnswerSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <input
                                        id="answer-input"
                                        className="form-input"
                                        type="text"
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        placeholder="Type your answer…"
                                        required
                                        style={{ flex: '1', minWidth: '200px' }}
                                    />
                                    <button className={`btn ${clue.type === 'final' ? 'btn-purple' : 'btn-primary'}`} type="submit" disabled={submitting}>
                                        {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Checking…</> : '→ Submit'}
                                    </button>
                                </form>
                            )}

                            {/* Conditionally Render QR Scanner Option */}
                            {clue.hasQR !== false && (
                                <div style={{ borderTop: (clue.type === 'technical' || clue.type === 'final') ? '1px dashed var(--border-subtle)' : 'none', paddingTop: (clue.type === 'technical' || clue.type === 'final') ? '1rem' : 0 }}>
                                    <button className="btn btn-ghost btn-sm w-full" onClick={() => setShowQR((v) => !v)} style={{ borderStyle: 'dashed' }}>
                                        {showQR ? '✕ Hide Scanner' : clue.type === 'physical' ? '📷 Open Scanner' : '📷 Or Scan QR Code Instead'}
                                    </button>

                                    {showQR && (
                                        <div style={{ marginTop: '1.25rem' }}>
                                            <QRScanner onSuccess={handleQRSuccess} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
