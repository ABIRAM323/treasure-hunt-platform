const express = require('express');
const jwt = require('jsonwebtoken');
const Team = require('../models/Team');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Team Login
router.post('/team-login', authLimiter, async (req, res) => {
    const { teamId, password } = req.body;

    if (!teamId || !password) {
        return res.status(400).json({ success: false, message: 'Team ID and password are required' });
    }

    const team = await Team.findOne({ teamId: teamId.toUpperCase() }).select('+password');
    if (!team) {
        return res.status(401).json({ success: false, message: 'Invalid Team ID or password' });
    }

    const isMatch = await team.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Team ID or password' });
    }

    const token = jwt.sign(
        { id: team._id, teamId: team.teamId, role: 'team', name: team.name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
        success: true,
        token,
        team: {
            id: team._id,
            teamId: team.teamId,
            name: team.name,
            members: team.members,
            score: team.score,
            status: team.status,
        },
    });
});

// Admin Login
router.post('/admin-login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
        { role: 'admin', username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ success: true, token, admin: { username } });
});

// Verify token
router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, valid: false });
    }
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ success: true, valid: true, user: decoded });
    } catch {
        res.status(401).json({ success: false, valid: false });
    }
});

module.exports = router;
