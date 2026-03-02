import { useSocket } from '../context/SocketContext';

function formatTime(ms) {
    if (!ms || ms <= 0) return { h: '00', m: '00', s: '00' };
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return { h, m, s };
}

export default function CountdownTimer({ large = false }) {
    const { timerState, eventState } = useSocket();
    const { remaining, isRunning } = timerState;
    const { isLocked } = eventState;

    const { h, m, s } = formatTime(remaining);
    const isUrgent = remaining > 0 && remaining < 10 * 60 * 1000; // < 10 min

    if (!isRunning && !isLocked && remaining === 0) {
        return (
            <div className={`timer-wrap ${large ? 'timer-large' : ''}`}>
                <span className="timer-waiting">Waiting for event start…</span>
            </div>
        );
    }

    return (
        <div className={`timer-wrap ${large ? 'timer-large' : ''} ${isUrgent ? 'timer-urgent' : ''} ${isLocked ? 'timer-ended' : ''}`}>
            {isLocked ? (
                <span className="timer-display text-pink">EVENT ENDED</span>
            ) : (
                <div className="timer-display">
                    <span className="timer-segment">{h}</span>
                    <span className="timer-colon">:</span>
                    <span className="timer-segment">{m}</span>
                    <span className="timer-colon">:</span>
                    <span className="timer-segment">{s}</span>
                </div>
            )}
            <style>{`
        .timer-wrap { display: inline-flex; align-items: center; gap: 0.25rem; }
        .timer-display { display: flex; align-items: center; gap: 0.1rem; font-family: var(--font-display); font-weight: 700; }
        .timer-segment {
          background: rgba(0,255,136,0.08);
          border: 1px solid rgba(0,255,136,0.2);
          border-radius: 6px;
          padding: 0.1rem 0.4rem;
          color: var(--neon-green);
          font-size: ${large ? '2.5rem' : '1.1rem'};
          min-width: ${large ? '3rem' : '2rem'};
          text-align: center;
          text-shadow: 0 0 15px rgba(0,255,136,0.6);
          transition: color 0.3s;
        }
        .timer-colon {
          color: var(--neon-green);
          font-family: var(--font-display);
          font-size: ${large ? '2.5rem' : '1.1rem'};
          font-weight: 700;
          animation: blink 1s step-end infinite;
          text-shadow: 0 0 10px rgba(0,255,136,0.5);
        }
        @keyframes blink { 50% { opacity: 0.3; } }
        .timer-urgent .timer-segment { color: var(--neon-pink); border-color: rgba(255,45,126,0.3); background: rgba(255,45,126,0.08); text-shadow: 0 0 15px rgba(255,45,126,0.6); }
        .timer-urgent .timer-colon { color: var(--neon-pink); }
        .timer-ended .timer-display { font-size: ${large ? '2rem' : '1rem'}; text-shadow: 0 0 15px rgba(255,45,126,0.6); }
        .timer-waiting { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); letter-spacing: 0.1em; animation: blink 2s ease-in-out infinite; }
        .timer-large { justify-content: center; }
      `}</style>
        </div>
    );
}
