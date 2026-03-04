const express = require('express');
const Clue = require('../models/Clue');
const Team = require('../models/Team');
const { buildClueOrder } = require('../utils/scoring');
const { generateQRHash } = require('../utils/qrHelper');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const LOCATIONS = [
    'Main Entrance', 'Library', 'Computer Lab A', 'Computer Lab B',
    'Cafeteria', 'Admin Block', 'Sports Ground', 'Auditorium',
    'Workshop', 'Seminar Hall', 'Rooftop Garden', 'Parking Lot', 'Reception'
];

// POST /api/seed/clues  — seeds 13 physical + 13 technical + 1 final demo clues
router.post('/clues', requireAdmin, async (req, res) => {
    try {
        // Remove existing physical and technical demo clues if force=true
        const { force } = req.body;
        if (force) {
            await Clue.deleteMany({ type: { $in: ['physical', 'technical'] } });
        }

        const existingNums = new Set(
            (await Clue.find({}, 'clueNumber type')).map(c => `${c.type}-${c.clueNumber}`)
        );

        const created = [];

        // 13 Physical Clues
        for (let i = 1; i <= 13; i++) {
            const key = `physical-${i}`;
            if (existingNums.has(key)) continue;

            const diff = DIFFICULTIES[(i - 1) % DIFFICULTIES.length];
            const basePoints = diff === 'easy' ? 100 : diff === 'medium' ? 200 : 350;
            const clue = await Clue.create({
                clueNumber: i,
                type: 'physical',
                difficulty: diff,
                title: `Physical Clue ${i}: The Hidden Mark`,
                clueText: `Find the red marker posted on the wall near the ${LOCATIONS[i - 1]}. Look carefully around the entrance area for a QR code or signboard.`,
                answer: `physical${i}`,
                locationName: LOCATIONS[i - 1],
                locationCoords: { x: (i * 37) % 800, y: (i * 53) % 600 },
                points: basePoints,
                hint: `Check the ${LOCATIONS[i - 1]} area thoroughly — it's usually posted at eye level.`,
                hasQR: true,
            });
            clue.qrHash = generateQRHash(clue._id.toString());
            await clue.save();
            created.push(clue);
        }

        // 13 Technical Clues
        for (let i = 1; i <= 13; i++) {
            const key = `technical-${i}`;
            if (existingNums.has(key)) continue;

            const diff = DIFFICULTIES[(i - 1) % DIFFICULTIES.length];
            const basePoints = diff === 'easy' ? 100 : diff === 'medium' ? 200 : 350;

            const questions = [
                { q: 'What is the output of: console.log(typeof null)?', a: 'object' },
                { q: 'What does HTML stand for?', a: 'HyperText Markup Language' },
                { q: 'What is the binary representation of decimal 10?', a: '1010' },
                { q: 'What does CSS stand for?', a: 'Cascading Style Sheets' },
                { q: 'What command initializes a new git repository?', a: 'git init' },
                { q: 'What HTTP status code means "Not Found"?', a: '404' },
                { q: 'In Python, what function converts a string to an integer?', a: 'int' },
                { q: 'What is the shortcut to open DevTools in Chrome?', a: 'F12' },
                { q: 'What does API stand for?', a: 'Application Programming Interface' },
                { q: 'What data structure follows LIFO order?', a: 'stack' },
                { q: 'What command lists files in a Linux directory?', a: 'ls' },
                { q: 'How many bits are in a byte?', a: '8' },
                { q: 'What does SQL stand for?', a: 'Structured Query Language' },
            ];

            const qItem = questions[i - 1];
            const clue = await Clue.create({
                clueNumber: i,
                type: 'technical',
                difficulty: diff,
                title: `Technical Clue ${i}: Code Breaker`,
                clueText: qItem.q,
                answer: qItem.a,
                points: basePoints,
                hint: `Think carefully and type the answer in lowercase with no extra spaces.`,
                hasQR: false,
            });
            clue.qrHash = generateQRHash(clue._id.toString());
            await clue.save();
            created.push(clue);
        }

        // Ensure at least 1 final clue exists
        const finalExists = await Clue.findOne({ type: 'final' });
        if (!finalExists) {
            const finalClue = await Clue.create({
                clueNumber: 1,
                type: 'final',
                difficulty: 'boss',
                title: 'Final Boss: The Ultimate Challenge',
                clueText: 'You have reached the final challenge! What is the motto of your institution? (Check the main gate signboard or official website.)',
                answer: 'knowledge is power',
                points: 500,
                hint: 'Look at the official college website or the main gate.',
                hasQR: false,
            });
            finalClue.qrHash = generateQRHash(finalClue._id.toString());
            await finalClue.save();
            created.push(finalClue);
        }

        // Re-apply clue patterns for all teams
        const physicalClues = await Clue.find({ type: 'physical', isActive: true });
        const technicalClues = await Clue.find({ type: 'technical', isActive: true });
        const finalClues = await Clue.find({ type: 'final', isActive: true });

        const teams = await Team.find().sort({ createdAt: 1 });
        for (let idx = 0; idx < teams.length; idx++) {
            const t = teams[idx];
            t.clueOrder = buildClueOrder(physicalClues, technicalClues, finalClues, idx);
            await t.save();
        }

        res.json({
            success: true,
            message: `Seeded ${created.length} clues and updated ${teams.length} team patterns.`,
            created: created.length,
            teamsUpdated: teams.length,
        });
    } catch (err) {
        console.error('Seed error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
