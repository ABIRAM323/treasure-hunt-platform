export default function ProgressBar({ completed, total, label, color = 'green' }) {
    const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

    const colors = {
        green: { bar: 'linear-gradient(90deg,#00cc6a,#00ff88)', glow: 'rgba(0,255,136,0.5)', dot: '#00ff88' },
        cyan: { bar: 'linear-gradient(90deg,#007799,#00e5ff)', glow: 'rgba(0,229,255,0.5)', dot: '#00e5ff' },
        purple: { bar: 'linear-gradient(90deg,#660099,#b84dff)', glow: 'rgba(184,77,255,0.5)', dot: '#b84dff' },
        pink: { bar: 'linear-gradient(90deg,#880033,#ff2d7e)', glow: 'rgba(255,45,126,0.5)', dot: '#ff2d7e' },
    };
    const c = colors[color] || colors.green;

    return (
        <div className="pb-container">
            <div className="pb-header">
                {label && <span className="pb-label">{label}</span>}
                <span className="pb-count">
                    <span style={{ color: c.dot }}>{completed}</span>
                    <span className="text-muted"> / {total}</span>
                    <span className="pb-pct"> ({percent}%)</span>
                </span>
            </div>
            <div className="pb-track">
                <div
                    className="pb-fill"
                    style={{
                        width: `${percent}%`,
                        background: c.bar,
                        boxShadow: percent > 0 ? `0 0 10px ${c.glow}` : 'none',
                    }}
                >
                    {percent > 0 && (
                        <span className="pb-dot" style={{ background: c.dot, boxShadow: `0 0 8px ${c.dot}` }} />
                    )}
                </div>
            </div>
            <style>{`
        .pb-container { display: flex; flex-direction: column; gap: 0.5rem; }
        .pb-header { display: flex; justify-content: space-between; align-items: center; }
        .pb-label { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .pb-count { font-family: var(--font-mono); font-size: 0.85rem; }
        .pb-pct { color: var(--text-muted); font-size: 0.75rem; }
        .pb-track { background: rgba(255,255,255,0.06); border-radius: 999px; overflow: visible; height: 8px; position: relative; }
        .pb-fill { height: 100%; border-radius: 999px; min-width: ${percent > 0 ? '16px' : '0'}; transition: width 0.7s cubic-bezier(0.34,1.56,0.64,1); position: relative; display: flex; align-items: center; }
        .pb-dot { position: absolute; right: -4px; width: 16px; height: 16px; border-radius: 50%; top: 50%; transform: translateY(-50%); }
      `}</style>
        </div>
    );
}
