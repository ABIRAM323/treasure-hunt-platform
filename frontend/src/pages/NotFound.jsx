import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="page-center" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)', color: 'var(--neon-pink)', textShadow: '0 0 30px rgba(255,45,126,0.5)' }}>
                404
            </div>
            <h1 style={{ marginBottom: '0.75rem' }}>Location Not Found</h1>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>This clue doesn't exist in the hunt.</p>
            <Link to="/login" className="btn btn-primary">← Return to Base Camp</Link>
        </div>
    );
}
