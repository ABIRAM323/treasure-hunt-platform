import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import AdminMap from '../components/AdminMap';

const TABS = ['overview', 'teams', 'clues', 'event', 'map', 'export'];
const TAB_LABELS = { overview: '📊 Overview', teams: '👥 Teams', clues: '🗺 Clues', event: '⏱ Event', map: '📍 Map', export: '📥 Export' };

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
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '0.5rem' }}>QR Code</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Location: {qrModal.locationName || 'N/A'}
                        </p>
                        <img src={qrModal.qrDataUrl} alt="QR Code" style={{ width: '100%', borderRadius: 'var(--radius-md)' }} />
                        <p style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                            Clue ID: {qrModal.clueId}
                        </p>
                        <button className="btn btn-ghost w-full" style={{ marginTop: '1rem' }} onClick={() => setQrModal(null)}>Close</button>
                    </div>
                </div>
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
                                                    <span className={`badge ${team.status === 'finished' ? 'badge-yellow' :
                                                        team.status === 'final' ? 'badge-purple' :
                                                            team.status === 'searching' ? 'badge-green' : 'badge-muted'
                                                        }`}>{team.status}</span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>{team.lastLocation || '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                            <button className="btn btn-primary btn-sm" onClick={() => setTeamModal({})}>+ Create Team</button>
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

// ─── Sub-components ───

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
                // Ensure media URL is absolute by prepending API URL if in development, else relative is fine if frontend and backend on same domain
                const baseUrl = import.meta.env.VITE_API_URL || '';
                setForm(f => ({ ...f, mediaUrl: baseUrl + data.mediaUrl }));
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
                            </select>
                        </div>
                        {form.mediaType !== 'none' && (
                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '0.25rem' }}>Media File / URL</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input type="file" onChange={handleMediaUpload} accept={form.mediaType === 'image' ? 'image/*' : 'audio/*'} className="form-input" style={{ padding: '0.2rem' }} />
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
