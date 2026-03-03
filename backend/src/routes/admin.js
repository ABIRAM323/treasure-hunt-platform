const express = require('express');
const { Parser } = require('json2csv');
const Team = require('../models/Team');
const Clue = require('../models/Clue');
const Attempt = require('../models/Attempt');
const Event = require('../models/Event');
const { requireAdmin } = require('../middleware/auth');
const { buildClueOrder } = require('../utils/scoring');
const { generateQRCode, generateQRHash } = require('../utils/qrHelper');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// ============== TEAM MANAGEMENT ==============

// GET all teams
router.get('/teams', requireAdmin, async (req, res) => {
    const teams = await Team.find().populate({ path: 'clueOrder', select: 'type difficulty title clueNumber' });
    res.json({ success: true, teams });
});

// GET single team
router.get('/teams/:id', requireAdmin, async (req, res) => {
    const team = await Team.findById(req.params.id).populate({ path: 'clueOrder', select: '-answer -qrHash' });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, team });
});

// POST create team
router.post('/teams', requireAdmin, async (req, res) => {
    const { teamId, name, password, members } = req.body;
    if (!teamId || !name || !password) {
        return res.status(400).json({ success: false, message: 'teamId, name, and password are required' });
    }

    const existing = await Team.findOne({ teamId: teamId.toUpperCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Team ID already exists' });

    // Build deterministic shifted clue order
    const physicalClues = await Clue.find({ type: 'physical', isActive: true });
    const technicalClues = await Clue.find({ type: 'technical', isActive: true });
    const finalClues = await Clue.find({ type: 'final', isActive: true });

    const existingTeamsCount = await Team.countDocuments();
    const clueOrder = buildClueOrder(physicalClues, technicalClues, finalClues, existingTeamsCount);

    const team = await Team.create({
        teamId: teamId.toUpperCase(),
        name,
        password,
        members: members || [],
        clueOrder,
    });

    res.status(201).json({ success: true, team: { ...team.toJSON(), password: undefined } });
});

// PUT update team
router.put('/teams/:id', requireAdmin, async (req, res) => {
    const { name, members, score, status } = req.body;
    const team = await Team.findByIdAndUpdate(
        req.params.id,
        { name, members, score, status },
        { new: true, runValidators: true }
    );
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, team });
});

// DELETE team
router.delete('/teams/:id', requireAdmin, async (req, res) => {
    await Team.findByIdAndDelete(req.params.id);
    await Attempt.deleteMany({ teamId: req.params.id });
    res.json({ success: true, message: 'Team deleted' });
});

// POST reset a team's progress
router.post('/teams/:id/reset', requireAdmin, async (req, res) => {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // Determine team index to keep their specific linear track
    const allTeams = await Team.find().sort({ _id: 1 }).select('_id');
    const teamIndex = allTeams.findIndex(t => t._id.equals(team._id));

    // Reassign shifted clue order
    const physicalClues = await Clue.find({ type: 'physical', isActive: true });
    const technicalClues = await Clue.find({ type: 'technical', isActive: true });
    const finalClues = await Clue.find({ type: 'final', isActive: true });
    const clueOrder = buildClueOrder(physicalClues, technicalClues, finalClues, Math.max(0, teamIndex));

    team.score = 0;
    team.currentClueIndex = 0;
    team.clueOrder = clueOrder;
    team.usedClues = [];
    team.lastLocation = '';
    team.status = 'waiting';
    team.startTime = null;
    team.completedAt = null;
    await team.save();

    await Attempt.deleteMany({ teamId: team._id });

    const io = req.app.get('io');
    if (io) {
        const leaderboard = await getLeaderboardData();
        io.emit('leaderboard:update', leaderboard);
    }

    res.json({ success: true, message: 'Team reset', team });
});

// POST override/skip a team's current clue
router.post('/teams/:id/override-clue', requireAdmin, async (req, res) => {
    const team = await Team.findById(req.params.id).populate('clueOrder');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    if (team.currentClueIndex >= team.clueOrder.length) {
        return res.status(400).json({ success: false, message: 'Team has completed all clues' });
    }

    team.currentClueIndex += 1;
    if (team.currentClueIndex >= team.clueOrder.length) {
        team.status = 'finished';
    }
    await team.save();

    const io = req.app.get('io');
    if (io) {
        const leaderboard = await getLeaderboardData();
        io.emit('leaderboard:update', leaderboard);
        io.emit('team:status', { teamId: team.teamId, status: team.status, currentClueIndex: team.currentClueIndex });
    }

    res.json({ success: true, message: 'Clue skipped', team });
});

// ============== CLUE MANAGEMENT ==============

// GET all clues (with answers for admin)
router.get('/clues', requireAdmin, async (req, res) => {
    const clues = await Clue.find().select('+answer +qrHash +hasQR').sort({ clueNumber: 1 });
    res.json({ success: true, clues });
});

// GET single clue
router.get('/clues/:id', requireAdmin, async (req, res) => {
    const clue = await Clue.findById(req.params.id).select('+answer +qrHash +hasQR');
    if (!clue) return res.status(404).json({ success: false, message: 'Clue not found' });
    res.json({ success: true, clue });
});

// POST create clue
router.post('/clues', requireAdmin, async (req, res) => {
    const { clueNumber, type, difficulty, title, clueText, answer, locationName, locationCoords, points, hint, hasQR } = req.body;
    if (!clueNumber || !type || !difficulty || !title || !clueText || !answer) {
        return res.status(400).json({ success: false, message: 'Missing required clue fields' });
    }

    const clueData = { clueNumber, type, difficulty, title, clueText, answer, locationName, locationCoords, points, hint, hasQR: hasQR !== undefined ? hasQR : true };

    const clue = await Clue.create(clueData);

    // Generate QR hash for ALL clues (so admins can print a QR for any clue if enabled)
    clue.qrHash = generateQRHash(clue._id.toString());
    await clue.save();

    res.status(201).json({ success: true, clue });
});

// PUT update clue
router.put('/clues/:id', requireAdmin, async (req, res) => {
    const clue = await Clue.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('+answer +qrHash');
    if (!clue) return res.status(404).json({ success: false, message: 'Clue not found' });

    // Ensure all clues eventually get a QR hash if updated without one
    if (!clue.qrHash) {
        clue.qrHash = generateQRHash(clue._id.toString());
        await clue.save();
    }

    res.json({ success: true, clue });
});

// DELETE clue
router.delete('/clues/:id', requireAdmin, async (req, res) => {
    await Clue.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Clue deleted' });
});

// GET generate QR code image for ANY clue
router.get('/clues/:id/qr', requireAdmin, async (req, res) => {
    const clue = await Clue.findById(req.params.id).select('+qrHash');
    if (!clue) return res.status(404).json({ success: false, message: 'Clue not found' });

    const qrDataUrl = await generateQRCode(clue._id.toString());
    res.json({ success: true, qrDataUrl, clueId: clue._id, locationName: clue.locationName });
});

// POST upload media
router.post('/upload-media', requireAdmin, upload.single('media'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const mediaUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, mediaUrl });
});

// ============== EVENT MANAGEMENT ==============

// GET event state
router.get('/event', requireAdmin, async (req, res) => {
    let event = await Event.findOne();
    if (!event) event = await Event.create({});
    res.json({ success: true, event });
});

// POST start event
router.post('/event/start', requireAdmin, async (req, res) => {
    const { duration } = req.body; // duration in hours
    let event = await Event.findOne();
    if (!event) event = new Event();

    event.startTime = new Date();
    event.duration = (duration || 3) * 60 * 60 * 1000;
    event.isRunning = true;
    event.isLocked = false;
    await event.save();

    // Update all waiting teams to searching
    await Team.updateMany({ status: 'waiting' }, { $set: { status: 'searching', startTime: event.startTime } });

    const io = req.app.get('io');
    if (io) {
        io.emit('event:start', {
            startTime: event.startTime,
            duration: event.duration,
        });
        const leaderboard = await getLeaderboardData();
        io.emit('leaderboard:update', leaderboard);
    }

    res.json({ success: true, event });
});

// POST stop/lock event
router.post('/event/stop', requireAdmin, async (req, res) => {
    const event = await Event.findOne();
    if (!event) return res.status(404).json({ success: false, message: 'No event found' });

    event.isRunning = false;
    event.isLocked = true;
    await event.save();

    const io = req.app.get('io');
    if (io) io.emit('event:stop', { message: 'Event has ended!' });

    res.json({ success: true, event });
});

// POST reset event (full reset)
router.post('/event/reset', requireAdmin, async (req, res) => {
    // Reset event
    await Event.deleteMany({});
    const newEvent = await Event.create({});

    // Reset all teams
    const physicalClues = await Clue.find({ type: 'physical', isActive: true });
    const technicalClues = await Clue.find({ type: 'technical', isActive: true });
    const finalClues = await Clue.find({ type: 'final', isActive: true });

    const teams = await Team.find().sort({ _id: 1 });
    let teamIndex = 0;

    for (const team of teams) {
        const clueOrder = buildClueOrder(physicalClues, technicalClues, finalClues, teamIndex++);
        team.score = 0;
        team.currentClueIndex = 0;
        team.clueOrder = clueOrder;
        team.usedClues = [];
        team.lastLocation = '';
        team.status = 'waiting';
        team.startTime = null;
        team.completedAt = null;
        await team.save();
    }
    await Attempt.deleteMany({});

    const io = req.app.get('io');
    if (io) {
        io.emit('event:reset', { message: 'Event has been reset!' });
        const leaderboard = await getLeaderboardData();
        io.emit('leaderboard:update', leaderboard);
    }

    res.json({ success: true, message: 'Event and all teams have been reset', event: newEvent });
});

// ============== EXPORT ==============

// GET export results as CSV
router.get('/export', requireAdmin, async (req, res) => {
    const teams = await Team.find()
        .sort({ score: -1, completedAt: 1 })
        .populate({ path: 'clueOrder', select: 'type' })
        .lean();

    const data = teams.map((team, idx) => ({
        Rank: idx + 1,
        TeamID: team.teamId,
        TeamName: team.name,
        Score: team.score,
        Status: team.status,
        CluesCompleted: team.currentClueIndex || 0,
        TotalClues: team.clueOrder ? team.clueOrder.length : 0,
        LastLocation: team.lastLocation || '-',
        Members: team.members ? team.members.map((m) => m.name).join(', ') : '',
        CompletedAt: team.completedAt ? new Date(team.completedAt).toLocaleString() : '-',
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="treasure_hunt_results.csv"');
    res.send(csv);
});

// ============== LIVE PROGRESS ==============

// GET all teams progress (for admin live view)
router.get('/progress', requireAdmin, async (req, res) => {
    const teams = await Team.find()
        .populate({ path: 'clueOrder', select: 'type difficulty title clueNumber' })
        .sort({ score: -1 })
        .lean();

    const progress = teams.map((team) => ({
        id: team._id,
        teamId: team.teamId,
        name: team.name,
        score: team.score,
        status: team.status,
        currentClueIndex: team.currentClueIndex || 0,
        totalClues: team.clueOrder ? team.clueOrder.length : 0,
        lastLocation: team.lastLocation,
        members: team.members,
        currentClue: team.clueOrder && team.clueOrder[team.currentClueIndex]
            ? team.clueOrder[team.currentClueIndex]
            : null,
    }));

    res.json({ success: true, progress });
});

// Helper
async function getLeaderboardData() {
    return await Team.find({}, 'teamId name score status currentClueIndex lastLocation members completedAt')
        .sort({ score: -1, completedAt: 1 })
        .lean();
}

module.exports = router;
