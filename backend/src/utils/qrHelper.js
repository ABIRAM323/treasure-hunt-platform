const crypto = require('crypto');
const QRCode = require('qrcode');

/**
 * Generate a secure HMAC-SHA256 hash for a clue's QR code
 * @param {string} clueId - MongoDB ObjectId as string
 * @returns {string} hex hash
 */
const generateQRHash = (clueId) => {
    return crypto
        .createHmac('sha256', process.env.QR_SECRET || 'default_secret')
        .update(clueId.toString())
        .digest('hex');
};

/**
 * Verify a QR scan payload
 * @param {string} clueId
 * @param {string} hash
 * @returns {boolean}
 */
const verifyQRHash = (clueId, hash) => {
    const expected = generateQRHash(clueId);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
};

/**
 * Generate QR code as base64 data URL
 * @param {string} clueId
 * @returns {Promise<string>} base64 PNG data URL
 */
const generateQRCode = async (clueId) => {
    const hash = generateQRHash(clueId);
    const payload = JSON.stringify({ clueId, hash });
    return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        margin: 2,
        color: {
            dark: '#00ff88',
            light: '#0a0a1a',
        },
        width: 300,
    });
};

module.exports = { generateQRHash, verifyQRHash, generateQRCode };
