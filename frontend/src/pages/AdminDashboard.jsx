import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import AdminMap from '../components/AdminMap';

const TABS = ['overview', 'teams', 'clues', 'event', 'map', 'export'];
const TAB_LABELS = { overview: '📊 Overview', teams: '👥 Teams', clues: '🗺 Clues', event: '⏱ Event', map: '📍 Map', export: '📥 Export' };

// Live timer for admin table: shows hours:mm:ss since team started (or total if finished)
function AdminTeamTimer({ team }) {
    const [elapsed, setElapsed] = useState(0);

    const startTime = team.startTime || team.clueStartTime;
    const isFinished = team.status === 'finished';

    useEffect(() => {
        // If finished, compute final time from clueDurations total
        if (isFinished) {
            const total = (team.clueDurations || []).reduce((a, d) => a + d.durationMs, 0);
            setElapsed(Math.floor(total / 1000));
            return;
        }
        if (!startTime) return;
        const start = new Date(startTime).getTime();
        const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [startTime, isFinished]);

    const fmt = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    if (!startTime && !isFinished) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

    return (
        <span style={{
            fontFamily: 'var(--font-mono)',
            color: isFinished ? 'var(--neon-yellow)' : 'var(--neon-cyan)',
            fontSize: '0.85rem',
        }}>
            {fmt(elapsed)}{!isFinished && <span style={{ fontSize: '0.6rem', marginLeft: 4, opacity: 0.6 }}>live</span>}
        </span>
    );
}

export default function AdminDashboard() {
    const [tab, setTab] = useState('overview');
    const [progress, setProgress] = useState([]);
    const [teams, setTeams] = useState([]);
    const [clues, setClues] = useState([]);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState(null);
    const [qrModal, setQrModal] = useState(null);
    const [teamModal, setTeamModal] = useState(null);
    const [clueModal, setClueModal] = useState(null);
    const [statsModal, setStatsModal] = useState(null);
    const navigate = useNavigate();

    const flash = (text, type = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 3500);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [pt, tc, ev] = await Promise.all([
                api.get('/admin/progress'),
                api.get('/admin/clues'),
                api.get('/admin/event'),
            ]);
            setProgress(pt.data.progress || []);
            setTeams(pt.data.progress || []);
            setClues(tc.data.clues || []);
            setEvent(ev.data.event);
        } catch (err) {
            if (err.response?.status === 403) navigate('/admin/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Teams CRUD
    const fetchTeams = async () => {
        const { data } = await api.get('/admin/teams');
        setTeams(data.teams || []);
    };

    const deleteTeam = async (id) => {
        if (!confirm('Delete this team?')) return;
        await api.delete(`/admin/teams/${id}`);
        flash('Team deleted');
        fetchTeams();
    };

    const reapplyPatterns = async () => {
        try {
            const { data } = await api.post('/admin/teams/reapply-patterns');
            flash(`✅ ${data.message}`);
            fetchAll();
        } catch (err) {
            flash(err.response?.data?.message || 'Failed to reapply patterns', 'warning');
        }
    };

    const resetTeam = async (id) => {
        await api.post(`/admin/teams/${id}/reset`);
        flash('Team reset');
        fetchAll();
    };

    const skipClue = async (id) => {
        await api.post(`/admin/teams/${id}/override-clue`);
        flash('Clue skipped');
        fetchAll();
    };

    // Clues CRUD
    const deleteClue = async (id) => {
        if (!confirm('Delete this clue?')) return;
        await api.delete(`/admin/clues/${id}`);
        flash('Clue deleted');
        const { data } = await api.get('/admin/clues');
        setClues(data.clues || []);
    };

    const showQR = async (clueId) => {
        const { data } = await api.get(`/admin/clues/${clueId}/qr`);
        setQrModal(data);
    };

    const downloadQRPng = (qrData, withLabel = true) => {
        const img = new Image();
        img.onload = () => {
            const headerH = withLabel ? 60 : 0;
            const locH = withLabel && qrData.locationName ? 36 : 0;
            const tokenH = withLabel && qrData.qrToken ? 48 : 0;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height + headerH + locH + tokenH;
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (withLabel) {
                // ── Header stripe ──
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(0, 0, canvas.width, headerH);

                // Clue number
                ctx.fillStyle = '#0a0a1a';
                ctx.font = `bold ${Math.round(headerH * 0.55)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`Clue #${qrData.clueNumber ?? '?'}`, canvas.width / 2, headerH / 2);

                // Title
                if (qrData.clueTitle) {
                    ctx.font = `${Math.round(headerH * 0.28)}px monospace`;
                    ctx.fillStyle = 'rgba(0,0,0,0.65)';
                    ctx.fillText(qrData.clueTitle, canvas.width / 2, headerH * 0.78);
                }
            }

            // ── QR image ──
            ctx.drawImage(img, 0, headerH, img.width, img.height);

            const belowQR = headerH + img.height;

            // ── Location footer ──
            if (withLabel && qrData.locationName) {
                ctx.fillStyle = '#111122';
                ctx.fillRect(0, belowQR, canvas.width, locH);
                ctx.fillStyle = '#00ff88';
                ctx.font = `${Math.round(locH * 0.45)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`📍 ${qrData.locationName}`, canvas.width / 2, belowQR + locH / 2);
            }

            // ── Token row ──
            if (withLabel && qrData.qrToken) {
                const tokenY = belowQR + locH;
                ctx.fillStyle = '#0d0d22';
                ctx.fillRect(0, tokenY, canvas.width, tokenH);

                // Separator line
                ctx.fillStyle = 'rgba(255,200,0,0.3)';
                ctx.fillRect(0, tokenY, canvas.width, 1);

                // Label
                ctx.fillStyle = 'rgba(255,200,0,0.55)';
                ctx.font = `${Math.round(tokenH * 0.22)}px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText('TOKEN (type if you cannot scan)', canvas.width / 2, tokenY + 5);

                // Token value
                ctx.fillStyle = '#ffe000';
                ctx.font = `bold ${Math.round(tokenH * 0.44)}px monospace`;
                ctx.textBaseline = 'bottom';
                ctx.fillText(qrData.qrToken, canvas.width / 2, tokenY + tokenH - 6);
            }

            const link = document.createElement('a');
            link.download = `qr-clue-${qrData.clueNumber ?? 'x'}${withLabel ? '-labeled' : ''}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.src = qrData.qrDataUrl;
    };

    // Event controls
    const startEvent = async (duration) => {
        await api.post('/admin/event/start', { duration });
        flash('Event started! Timer is running.');
        const { data } = await api.get('/admin/event');
        setEvent(data.event);
    };

    const stopEvent = async () => {
        await api.post('/admin/event/stop');
        flash('Event stopped and locked.', 'warning');
        const { data } = await api.get('/admin/event');
        setEvent(data.event);
    };

    const resetEvent = async () => {
        if (!confirm('Reset the ENTIRE event? All progress will be lost!')) return;
        await api.post('/admin/event/reset');
        flash('Event reset!');
        fetchAll();
    };

    const handleExport = () => {
        const token = localStorage.getItem('token');
        const url = `${import.meta.env.VITE_API_URL || ''}/api/admin/export`;
        // Create temp link
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'treasure_hunt_results.csv');
        // We must include auth; easiest is to redirect (CSV download handles it)
        fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => res.blob())
            .then((blob) => {
                const blobUrl = URL.createObjectURL(blob);
                a.href = blobUrl;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            });
    };

    const stats = {
        total: progress.length,
        finished: progress.filter((t) => t.status === 'finished').length,
        searching: progress.filter((t) => ['searching', 'final'].includes(t.status)).length,
        waiting: progress.filter((t) => t.status === 'waiting').length,
        topScore: progress.length ? Math.max(...progress.map((t) => t.score)) : 0,
    };

    if (loading) return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar title="Admin" />
            <div className="page-center" style={{ minHeight: 'calc(100vh - 70px)' }}>
                <div className="spinner" />
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh' }}>
            <Navbar title="Admin Dashboard" />

            {/* Global message */}
            {msg && (
                <div style={{ position: 'fixed', top: '80px', right: '1.5rem', zIndex: 999 }}>
                    <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-warning'}`} style={{ boxShadow: 'var(--shadow-deep)' }}>
                        {msg.text}
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {qrModal && (
                <div className="overlay" onClick={() => setQrModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: '0.25rem' }}>
                            QR Code — Clue #{qrModal.clueNumber ?? '?'}
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            {qrModal.clueTitle && <span style={{ color: 'var(--neon-cyan)', marginRight: '0.5rem' }}>{qrModal.clueTitle}</span>}
                            {qrModal.locationName && <>📍 {qrModal.locationName}</>}
                        </p>

                        {/* Preview with number badge overlay */}
                        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                            <img
                                src={qrModal.qrDataUrl}
                                alt="QR Code"
                                style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block' }}
                            />
                            <div style={{
                                position: 'absolute', top: '8px', left: '8px',
                                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                                border: '1px solid var(--neon-green)', borderRadius: '6px',
                                padding: '2px 10px', fontFamily: 'var(--font-mono)',
                                fontSize: '0.85rem', color: 'var(--neon-green)', fontWeight: 700,
                                letterSpacing: '0.05em',
                            }}>
                                #{qrModal.clueNumber ?? '?'}
                            </div>
                        </div>

                        {/* Token display */}
                        {qrModal.qrToken && (
                            <div style={{
                                marginTop: '0.75rem',
                                background: 'rgba(255,200,0,0.08)',
                                border: '1px solid rgba(255,200,0,0.35)',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.6rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                            }}>
                                <div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                                        Manual Token (teams type this)
                                    </div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--neon-yellow)', letterSpacing: '0.25em' }}>
                                        {qrModal.qrToken}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ borderColor: 'rgba(255,200,0,0.3)', color: 'var(--neon-yellow)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                    onClick={() => navigator.clipboard?.writeText(qrModal.qrToken)}
                                    title="Copy token"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        )}

                        {/* Download options */}
                        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1 }}
                                onClick={() => downloadQRPng(qrModal, true)}
                            >
                                📥 Download with Label
                            </button>
                            <button
                                className="btn btn-ghost btn-sm"
                                style={{ flex: 1 }}
                                onClick={() => downloadQRPng(qrModal, false)}
                            >
                                📥 QR Only
                            </button>
                        </div>

                        <p style={{ marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                            ID: {qrModal.clueId}
                        </p>
                        <button className="btn btn-ghost w-full" style={{ marginTop: '0.75rem' }} onClick={() => setQrModal(null)}>Close</button>
                    </div>
                </div>
            )}

            {/* Stats Modal */}
            {statsModal && (
                <TeamStatsModal team={statsModal} onClose={() => setStatsModal(null)} />
            )}

            <div className="container" style={{ padding: '1.5rem' }}>
                {/* Tab Bar */}
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '2rem', paddingBottom: '0.5rem' }}>
                    {TABS.map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); if (t === 'teams') fetchTeams(); }}
                            className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {TAB_LABELS[t]}
                        </button>
                    ))}
                    <button onClick={fetchAll} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>↻ Refresh</button>
                </div>

                {/* ─── OVERVIEW ─── */}
                {tab === 'overview' && (
                    <div className="animate-fade-in">
                        {/* Stat cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            {[
                                { label: 'Total Teams', value: stats.total, color: 'var(--neon-cyan)' },
                                { label: 'Finished', value: stats.finished, color: 'var(--neon-yellow)' },
                                { label: 'Searching', value: stats.searching, color: 'var(--neon-green)' },
                                { label: 'Waiting', value: stats.waiting, color: 'var(--text-muted)' },
                                { label: 'Top Score', value: stats.topScore, color: 'var(--neon-orange)' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="card" style={{ textAlign: 'center' }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color, textShadow: `0 0 15px ${color}40` }}>{value}</div>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Live progress table */}
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>Team Progress</h3>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Team</th>
                                            <th>Score</th>
                                            <th>Progress</th>
                                            <th>Time</th>
                                            <th>Status</th>
                                            <th>Last Location</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {progress.sort((a, b) => b.score - a.score).map((team) => (
                                            <tr key={team.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{team.name}</div>
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{team.teamId}</div>
                                                </td>
                                                <td style={{ fontFamily: 'var(--font-display)', color: 'var(--neon-green)' }}>{team.score}</td>
                                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                                                    {team.currentClueIndex}/{team.totalClues}
                                                </td>
                                                <td>
                                                    <AdminTeamTimer team={team} />
                                                </td>
                                                <td>
                                                    <span className={`badge ${team.status === 'finished' ? 'badge-yellow' :
                                                        team.status === 'final' ? 'badge-purple' :
                                                            team.status === 'searching' ? 'badge-green' : 'badge-muted'
                                                        }`}>{team.status}</span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>{team.lastLocation || '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => setStatsModal(team)} className="btn btn-ghost btn-sm" title="View time stats">📊</button>
                                                        <button onClick={() => skipClue(team.id)} className="btn btn-ghost btn-sm" title="Skip clue">⏭</button>
                                                        <button onClick={() => resetTeam(team.id)} className="btn btn-ghost btn-sm" title="Reset team">↺</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {progress.length === 0 && (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No teams found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── TEAMS ─── */}
                {tab === 'teams' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2>Team Management</h2>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ borderColor: 'rgba(0,255,255,0.3)', color: 'var(--neon-cyan)' }}
                                    onClick={reapplyPatterns}
                                    title="Re-assign clue order to all teams based on custom patterns"
                                >
                                    🔄 Re-apply Patterns
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => setTeamModal({})}>+ Create Team</button>
                            </div>
                        </div>

                        {/* Pattern info banner */}
                        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(0,255,255,0.05)', border: '1px solid rgba(0,255,255,0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            💡 Teams are assigned patterns by creation order (Team 1 = P1→T1→P11…, Team 2 = P2→P12→T2…). Click <strong style={{ color: 'var(--neon-cyan)' }}>Re-apply Patterns</strong> after adding all clues.
                        </div>

                        <div className="card">
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr><th>Team ID</th><th>Name</th><th>Score</th><th>Status</th><th>Members</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {teams.map((team) => (
                                            <tr key={team._id || team.id}>
                                                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>{team.teamId}</td>
                                                <td style={{ fontWeight: 600 }}>{team.name}</td>
                                                <td style={{ fontFamily: 'var(--font-display)', color: 'var(--neon-green)' }}>{team.score}</td>
                                                <td><span className="badge badge-muted">{team.status}</span></td>
                                                <td style={{ fontSize: '0.8rem' }}>{team.members?.length || 0} members</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button onClick={() => skipClue(team._id || team.id)} className="btn btn-ghost btn-sm">⏭ Skip</button>
                                                        <button onClick={() => resetTeam(team._id || team.id)} className="btn btn-ghost btn-sm">↺ Reset</button>
                                                        <button onClick={() => deleteTeam(team._id || team.id)} className="btn btn-danger btn-sm">✕</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {teams.length === 0 && (
                                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No teams. Create one above.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Create Team Modal */}
                        {teamModal && (
                            <CreateTeamModal
                                onClose={() => setTeamModal(null)}
                                onSave={async (data) => {
                                    await api.post('/admin/teams', data);
                                    flash('Team created!');
                                    setTeamModal(null);
                                    fetchTeams();
                                }}
                            />
                        )}
                    </div>
                )}

                {/* ─── CLUES ─── */}
                {tab === 'clues' && (
                    <div className="animate-fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2>Clue Management</h2>
                            <button className="btn btn-primary btn-sm" onClick={() => setClueModal({})}>+ Create Clue</button>
                        </div>

                        <div className="card">
                            <div className="table-wrap">
                                <table className="table">
                                    <thead>
                                        <tr><th>#</th><th>Title</th><th>Type</th><th>Difficulty</th><th>Points</th><th>Location</th><th>Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {clues.map((clue) => (
                                            <tr key={clue._id}>
                                                <td style={{ fontFamily: 'var(--font-mono)' }}>{clue.clueNumber}</td>
                                                <td style={{ fontWeight: 600 }}>{clue.title}</td>
                                                <td>
                                                    <span className={`badge ${clue.type === 'physical' ? 'badge-cyan' : clue.type === 'final' ? 'badge-purple' : 'badge-green'}`}>
                                                        {clue.type}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${clue.difficulty === 'easy' ? 'badge-green' : clue.difficulty === 'boss' ? 'badge-pink' : clue.difficulty === 'hard' ? 'badge-orange' : 'badge-yellow'}`}>
                                                        {clue.difficulty}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-yellow)' }}>{clue.points}</td>
                                                <td style={{ fontSize: '0.8rem' }}>{clue.locationName || '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        {clue.hasQR && (
                                                            <button onClick={() => showQR(clue._id)} className="btn btn-cyan btn-sm">QR</button>
                                                        )}
                                                        <button onClick={() => setClueModal(clue)} className="btn btn-ghost btn-sm">Edit</button>
                                                        <button onClick={() => deleteClue(clue._id)} className="btn btn-danger btn-sm">✕</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {clueModal && (
                            <ClueFormModal
                                clue={clueModal}
                                onClose={() => setClueModal(null)}
                                onSave={async (data) => {
                                    if (clueModal._id) {
                                        await api.put(`/admin/clues/${clueModal._id}`, data);
                                        flash('Clue updated!');
                                    } else {
                                        await api.post('/admin/clues', data);
                                        flash('Clue created!');
                                    }
                                    setClueModal(null);
                                    const { data: cd } = await api.get('/admin/clues');
                                    setClues(cd.clues || []);
                                }}
                            />
                        )}
                    </div>
                )}

                {/* ─── EVENT ─── */}
                {tab === 'event' && (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem' }}>Event Controls</h2>
                        <EventControls
                            event={event}
                            onStart={startEvent}
                            onStop={stopEvent}
                            onReset={resetEvent}
                        />
                    </div>
                )}

                {/* ─── MAP ─── */}
                {tab === 'map' && (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem' }}>Campus Map</h2>
                        <AdminMap teams={progress} clues={clues} />
                    </div>
                )}

                {/* ─── EXPORT ─── */}
                {tab === 'export' && (
                    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Export Results</h2>
                        <div className="card">
                            <p style={{ marginBottom: '1.5rem' }}>Download the current standings and team progress as a CSV file.</p>
                            <button onClick={handleExport} className="btn btn-primary">
                                📥 Download Results CSV
                            </button>
                            <div className="divider" />
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Current Standings Preview</h3>
                            <div className="table-wrap">
                                <table className="table">
                                    <thead><tr><th>Rank</th><th>Team</th><th>Score</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {[...progress].sort((a, b) => b.score - a.score).map((t, idx) => (
                                            <tr key={t.id}><td>#{idx + 1}</td><td>{t.name}</td><td style={{ color: 'var(--neon-green)', fontFamily: 'var(--font-display)' }}>{t.score}</td><td>{t.status}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TeamStatsModal({ team, onClose }) {
    const formatDuration = (ms) => {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${m}m ${s}s`;
    };

    const totalMs = (team.clueDurations || []).reduce((acc, d) => acc + d.durationMs, 0);

    return (
        <div className="overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Team Time Logs</h3>
                <p style={{ color: 'var(--text-neon)', fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600 }}>{team.name}</p>

                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <table className="table table-sm">
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>
                            <tr><th>Clue #</th><th>Duration</th></tr>
                        </thead>
                        <tbody>
                            {(team.clueDurations || []).map((d, i) => (
                                <tr key={i}>
                                    <td style={{ fontFamily: 'var(--font-mono)' }}>Clue {i + 1}</td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--neon-cyan)' }}>{formatDuration(d.durationMs)}</td>
                                </tr>
                            ))}
                            {(team.clueDurations || []).length === 0 && (
                                <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No clues completed yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Time</span>
                    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--neon-yellow)', fontSize: '1.5rem' }}>
                        {Math.floor(totalMs / 60000)}m {Math.floor((totalMs % 60000) / 1000)}s
                    </span>
                </div>

                <button className="btn btn-ghost w-full" style={{ marginTop: '1.5rem' }} onClick={onClose}>Close</button>
            </div>
        </div>
    );
}

function EventControls({ event, onStart, onStop, onReset }) {
    const [duration, setDuration] = useState(3);
    const isRunning = event?.isRunning;
    const isLocked = event?.isLocked;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
                <h3 style={{ marginBottom: '0.5rem' }}>Event Status</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <span className={`badge ${isRunning ? 'badge-green' : isLocked ? 'badge-pink' : 'badge-muted'}`}>
                        {isRunning ? '● Running' : isLocked ? '🔒 Ended' : '○ Not Started'}
                    </span>
                </div>
                {event?.startTime && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Started: {new Date(event.startTime).toLocaleTimeString()}
                    </p>
                )}
                {event?.duration && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Duration: {event.duration / 3600000}h
                    </p>
                )}
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Start Event</h3>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">Duration (hours)</label>
                    <input className="form-input" type="number" min={1} max={8} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                </div>
                <button
                    onClick={() => onStart(duration)}
                    className="btn btn-primary w-full"
                    disabled={isRunning}
                >
                    ▶ Start Event ({duration}h)
                </button>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1rem' }}>Controls</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button onClick={onStop} className="btn btn-danger" disabled={!isRunning}>
                        ⏹ Stop & Lock Event
                    </button>
                    <button onClick={onReset} className="btn btn-ghost" style={{ borderColor: 'rgba(255,45,126,0.4)', color: 'var(--neon-pink)' }}>
                        ⚠️ Full Reset (Dangerous)
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreateTeamModal({ onClose, onSave }) {
    const [form, setForm] = useState({ teamId: '', name: '', password: '', members: '' });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErr('');
        try {
            const members = form.members.split(',').map((s) => ({ name: s.trim() })).filter((m) => m.name);
            await onSave({ ...form, teamId: form.teamId.toUpperCase(), members });
        } catch (ex) {
            setErr(ex.response?.data?.message || 'Error creating team');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="overlay">
            <div className="modal">
                <h3 style={{ marginBottom: '1.5rem' }}>Create Team</h3>
                {err && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{err}</div>}
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Team ID</label>
                        <input className="form-input" value={form.teamId} onChange={set('teamId')} placeholder="TEAM06" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Team Name</label>
                        <input className="form-input" value={form.name} onChange={set('name')} placeholder="Code Warriors" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder="Team password" required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Members (comma-separated)</label>
                        <input className="form-input" value={form.members} onChange={set('members')} placeholder="Alice, Bob, Carol, Dave" />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Creating…' : 'Create Team'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ClueFormModal({ clue, onClose, onSave }) {
    const isEdit = !!clue._id;
    const [form, setForm] = useState({
        clueNumber: clue.clueNumber || '',
        type: clue.type || 'technical',
        difficulty: clue.difficulty || 'medium',
        title: clue.title || '',
        clueText: clue.clueText || '',
        answer: clue.answer || '',
        locationName: clue.locationName || '',
        points: clue.points || 200,
        hint: clue.hint || '',
        hasQR: clue.hasQR !== undefined ? clue.hasQR : true,
        mediaType: clue.mediaType || 'none',
        mediaUrl: clue.mediaUrl || '',
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErr('');
        try {
            await onSave({ ...form, clueNumber: Number(form.clueNumber), points: Number(form.points) });
        } catch (ex) {
            setErr(ex.response?.data?.message || 'Error saving clue');
        } finally {
            setSaving(false);
        }
    };

    const handleMediaUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('media', file);

        try {
            const { data } = await api.post('/admin/upload-media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (data.success) {
                // Save only the relative path returned by the server (e.g., /uploads/file.mp3)
                // This ensures the URL is portable regardless of host/port.
                setForm(f => ({ ...f, mediaUrl: data.mediaUrl }));
            }
        } catch (ex) {
            setErr(ex.response?.data?.message || 'Error uploading media file');
        }
    };

    return (
        <div className="overlay">
            <div className="modal" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>{isEdit ? 'Edit Clue' : 'Create Clue'}</h3>
                {err && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{err}</div>}
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Clue #</label>
                            <input className="form-input" type="number" value={form.clueNumber} onChange={set('clueNumber')} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Points</label>
                            <input className="form-input" type="number" value={form.points} onChange={set('points')} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <select className="form-input" value={form.type} onChange={set('type')}>
                                <option value="physical">Physical</option>
                                <option value="technical">Technical</option>
                                <option value="final">Final Boss</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Difficulty</label>
                            <select className="form-input" value={form.difficulty} onChange={set('difficulty')}>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                                <option value="boss">Boss</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input className="form-input" value={form.title} onChange={set('title')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Clue Text</label>
                        <textarea className="form-input" value={form.clueText} onChange={set('clueText')} rows={4} required />
                    </div>

                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <input type="checkbox" checked={form.hasQR} onChange={(e) => setForm(f => ({ ...f, hasQR: e.target.checked }))} id="hasQRCheck" style={{ width: 'auto', marginRight: '0.5rem' }} />
                        <label className="form-label" htmlFor="hasQRCheck" style={{ marginBottom: 0, textTransform: 'none', letterSpacing: 'normal' }}>Enable QR code scanning for this clue</label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Media Type</label>
                            <select className="form-input" value={form.mediaType} onChange={set('mediaType')}>
                                <option value="none">None</option>
                                <option value="image">Image</option>
                                <option value="audio">Audio</option>
                                <option value="video">Video</option>
                            </select>
                        </div>
                        {form.mediaType !== 'none' && (
                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Media File / URL</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input type="file" onChange={handleMediaUpload} accept={form.mediaType === 'image' ? 'image/*' : form.mediaType === 'audio' ? 'audio/*' : 'video/*'} className="form-input" style={{ padding: '0.2rem' }} />
                                    <input className="form-input" value={form.mediaUrl} onChange={set('mediaUrl')} placeholder="https://... or uploaded file URL" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Answer (case-insensitive match)</label>
                        <input className="form-input" value={form.answer} onChange={set('answer')} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Location Name (physical only)</label>
                        <input className="form-input" value={form.locationName} onChange={set('locationName')} placeholder="e.g. Computer Lab A" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Hint (shown after 3 wrong attempts)</label>
                        <input className="form-input" value={form.hint} onChange={set('hint')} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving…' : isEdit ? 'Update Clue' : 'Create Clue'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
