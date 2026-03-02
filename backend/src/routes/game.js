const express = require('express');
const Team = require('../models/Team');
const Clue = require('../models/Clue');
const Attempt = require('../models/Attempt');
const Event = require('../models/Event');
const { requireTeam } = require('../middleware/auth');
const { submissionLimiter } = require('../middleware/rateLimiter');
const { calculateScore, isFinalBossUnlocked, FINAL_BOSS_BONUS } = require('../utils/scoring');
const { verifyQRHash } = require('../utils/qrHelper');

const router = express.Router();

// GET current clue for the team
router.get('/current-clue', requireTeam, async (req, res) => {
    const team = await Team.findById(req.user.id).populate({
        path: 'clueOrder',
        select: '-answer -qrHash', // Never leak answer to frontend
    });

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const event = await Event.findOne();
    if (event && event.isLocked) {
        return res.status(403).json({ success: false, message: 'Event has ended. No more submissions accepted.' });
    }

    const totalClues = team.clueOrder.length;
    const completedCount = team.currentClueIndex;

    // Check if all clues done
    if (completedCount >= totalClues) {
        return res.json({
            success: true,
            finished: true,
            score: team.score,
            message: 'You have completed all clues! 🎉',
        });
    }

    const currentClue = team.clueOrder[team.currentClueIndex];

    // If current clue is 'final', check if unlocked
    if (currentClue.type === 'final') {
        const nonFinalTotal = team.clueOrder.filter((c) => c.type !== 'final').length;
        if (!isFinalBossUnlocked(completedCount, nonFinalTotal)) {
            return res.json({
                success: true,
                locked: true,
                message: `Complete ${Math.ceil(nonFinalTotal * 0.7) - completedCount} more clues to unlock the Final Boss!`,
                progress: { completed: completedCount, total: totalClues },
            });
        }
    }

    // Get previous attempts for hint at attempt count
    const attempt = await Attempt.findOne({ teamId: team._id, clueId: currentClue._id });

    res.json({
        success: true,
        clue: {
            _id: currentClue._id,
            clueNumber: currentClue.clueNumber,
            type: currentClue.type,
            difficulty: currentClue.difficulty,
            title: currentClue.title,
            clueText: currentClue.clueText,
            locationName: currentClue.locationName,
            locationCoords: currentClue.locationCoords,
            points: currentClue.points,
            hint: attempt && attempt.attemptCount >= 3 ? currentClue.hint : null,
            hasQR: currentClue.hasQR !== false,
        },
        progress: {
            completed: completedCount,
            total: totalClues,
            percent: Math.round((completedCount / totalClues) * 100),
        },
        score: team.score,
        status: team.status,
        attemptCount: attempt ? attempt.attemptCount : 0,
    });
});

// POST submit answer (technical clues)
router.post('/submit-answer', requireTeam, submissionLimiter, async (req, res) => {
    const { answer } = req.body;
    if (!answer) return res.status(400).json({ success: false, message: 'Answer is required' });

    const team = await Team.findById(req.user.id).populate('clueOrder');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const event = await Event.findOne();
    if (event && event.isLocked) {
        return res.status(403).json({ success: false, message: 'Event has ended.' });
    }

    if (team.currentClueIndex >= team.clueOrder.length) {
        return res.status(400).json({ success: false, message: 'No more clues to answer.' });
    }

    // Get clue WITH answer (server only!)
    const currentClue = await Clue.findById(team.clueOrder[team.currentClueIndex]._id).select('+answer');

    if (currentClue.type === 'physical') {
        return res.status(400).json({ success: false, message: 'This clue requires QR scanning, not a text answer.' });
    }

    // Normalise answers: lowercase + trim
    const normalizedAnswer = answer.trim().toLowerCase();
    const correctAnswer = currentClue.answer.trim().toLowerCase();

    // Track attempts
    let attempt = await Attempt.findOne({ teamId: team._id, clueId: currentClue._id });
    if (!attempt) {
        attempt = await Attempt.create({ teamId: team._id, clueId: currentClue._id, attemptCount: 0 });
    }

    if (normalizedAnswer !== correctAnswer) {
        attempt.attemptCount += 1;
        attempt.lastAttemptAt = new Date();
        await attempt.save();
        return res.json({
            success: false,
            correct: false,
            message: `Wrong answer! Attempts: ${attempt.attemptCount}`,
            attemptCount: attempt.attemptCount,
        });
    }

    // Correct! Calculate score
    await advanceTeam(team, currentClue, attempt, event, req.app.get('io'));

    res.json({
        success: true,
        correct: true,
        message: 'Correct! Well done! 🎉',
        score: team.score,
        nextClueIndex: team.currentClueIndex,
    });
});

// POST validate QR scan (physical clues)
router.post('/scan-qr', requireTeam, submissionLimiter, async (req, res) => {
    const { clueId, hash } = req.body;
    if (!clueId || !hash) {
        return res.status(400).json({ success: false, message: 'Invalid QR data' });
    }

    const event = await Event.findOne();
    if (event && event.isLocked) {
        return res.status(403).json({ success: false, message: 'Event has ended.' });
    }

    // Verify hash
    let valid = false;
    try {
        valid = verifyQRHash(clueId, hash);
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid QR format' });
    }
    if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid QR code. Tampered or wrong location.' });
    }

    const team = await Team.findById(req.user.id).populate('clueOrder');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    const currentClue = await Clue.findById(team.clueOrder[team.currentClueIndex]._id);

    if (currentClue._id.toString() !== clueId) {
        return res.status(400).json({ success: false, message: 'This QR is for a different clue. Check your current clue!' });
    }

    let attempt = await Attempt.findOne({ teamId: team._id, clueId: currentClue._id });
    if (!attempt) {
        attempt = await Attempt.create({ teamId: team._id, clueId: currentClue._id, attemptCount: 0 });
    }

    await advanceTeam(team, currentClue, attempt, event, req.app.get('io'));

    res.json({
        success: true,
        message: '✅ QR Verified! Clue unlocked!',
        score: team.score,
    });
});

// GET team progress summary
router.get('/progress', requireTeam, async (req, res) => {
    const team = await Team.findById(req.user.id).populate({
        path: 'clueOrder',
        select: '-answer -qrHash',
    });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    res.json({
        success: true,
        teamId: team.teamId,
        name: team.name,
        score: team.score,
        status: team.status,
        currentClueIndex: team.currentClueIndex,
        totalClues: team.clueOrder.length,
        lastLocation: team.lastLocation,
    });
});

// Helper: advance team to next clue
async function advanceTeam(team, currentClue, attempt, event, io) {
    const { total } = calculateScore(
        currentClue.difficulty,
        attempt.attemptCount,
        event ? event.startTime : null,
        event ? event.duration : 3 * 60 * 60 * 1000
    );

    team.score += total;
    team.currentClueIndex += 1;

    if (currentClue.locationName) {
        team.lastLocation = currentClue.locationName;
    }

    const totalClues = team.clueOrder.length;
    const allDone = team.currentClueIndex >= totalClues;

    // Determine new status
    const nextClue = allDone ? null : team.clueOrder[team.currentClueIndex];
    if (allDone) {
        team.status = 'finished';
        team.completedAt = new Date();
        team.score += FINAL_BOSS_BONUS; // bonus for full completion
    } else if (nextClue && nextClue.type === 'final') {
        team.status = 'final';
    } else {
        team.status = 'searching';
    }

    attempt.isCorrect = true;
    await attempt.save();
    await team.save();

    // Emit real-time update
    if (io) {
        const leaderboard = await getLeaderboardData();
        io.emit('leaderboard:update', leaderboard);
        io.emit('team:status', {
            teamId: team.teamId,
            name: team.name,
            score: team.score,
            status: team.status,
            currentClueIndex: team.currentClueIndex,
            lastLocation: team.lastLocation,
        });
    }
}

async function getLeaderboardData() {
    return await Team.find({}, 'teamId name score status currentClueIndex lastLocation members completedAt')
        .sort({ score: -1, completedAt: 1 })
        .lean();
}

module.exports = router;
