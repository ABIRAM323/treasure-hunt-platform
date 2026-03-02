const express = require('express');
const Team = require('../models/Team');

const router = express.Router();

// GET leaderboard (public)
router.get('/', async (req, res) => {
    const teams = await Team.find({}, 'teamId name score status currentClueIndex lastLocation members completedAt clueOrder')
        .sort({ score: -1, completedAt: 1 })
        .populate({ path: 'clueOrder', select: 'type' })
        .lean();

    const leaderboard = teams.map((team, index) => ({
        rank: index + 1,
        teamId: team.teamId,
        name: team.name,
        score: team.score,
        status: team.status,
        cluesCompleted: team.currentClueIndex || 0,
        totalClues: team.clueOrder ? team.clueOrder.length : 0,
        lastLocation: team.lastLocation,
        members: team.members,
        completedAt: team.completedAt,
    }));

    res.json({ success: true, leaderboard });
});

module.exports = router;
