import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../utils/api';

export default function QRScanner({ onSuccess, onError }) {
    const scannerRef = useRef(null);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const qrcodeId = 'qr-reader-' + Math.random().toString(36).substring(7);

    const startScanner = async () => {
        setError('');
        setSuccess('');
        try {
            const html5QrCode = new Html5Qrcode(qrcodeId);
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    // Pause scanning while processing
                    await html5QrCode.pause();
                    setScanning(false);
                    await processQR(decodedText, html5QrCode);
                },
                () => { } // Ignore frame errors
            );
            setScanning(true);
        } catch (err) {
            setError('Camera access denied or unavailable. Please allow camera access.');
            console.error(err);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch { }
        }
        setScanning(false);
    };

    const processQR = async (rawText, scanner) => {
        setLoading(true);
        try {
            const parsed = JSON.parse(rawText);
            const { data } = await api.post('/game/scan-qr', { clueId: parsed.clueId, hash: parsed.hash });
            setSuccess(data.message || '✅ QR Verified!');
            if (onSuccess) onSuccess(data);
            if (scanner) await scanner.stop().catch(() => { });
        } catch (err) {
            const msg = err.response?.data?.message || 'Invalid QR code. Try again.';
            setError(msg);
            if (onError) onError(msg);
            // Resume scanning after error
            setTimeout(() => {
                if (scannerRef.current) scannerRef.current.resume();
                setScanning(true);
                setError('');
            }, 3000);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        return () => { stopScanner(); };
    }, []);

    return (
        <div className="qr-scanner">
            <div id={qrcodeId} className="qr-viewport" />

            {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>⚠️ {error}</div>}
            {success && <div className="alert alert-success" style={{ marginTop: '1rem' }}>✅ {success}</div>}
            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                    <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Verifying QR…</span>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {!scanning ? (
                    <button onClick={startScanner} className="btn btn-primary" disabled={loading || !!success}>
                        📷 Scan QR Code
                    </button>
                ) : (
                    <button onClick={stopScanner} className="btn btn-danger">
                        ⏹ Stop Scanner
                    </button>
                )}
            </div>

            <style>{`
        .qr-scanner { display: flex; flex-direction: column; gap: 0.5rem; }
        .qr-viewport {
          width: 100%;
          max-width: 350px;
          min-height: ${scanning ? '300px' : '0'};
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 2px solid var(--border-glow);
          box-shadow: var(--shadow-neon);
          background: #000;
          transition: min-height 0.3s ease;
        }
        /* Override html5-qrcode styles */
        #${qrcodeId} video { width: 100% !important; }
        #${qrcodeId} img { display: none; }
      `}</style>
        </div>
    );
}
