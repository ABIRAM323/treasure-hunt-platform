const express = require('express');
const Clue = require('../models/Clue');
const Team = require('../models/Team');
const { buildClueOrder } = require('../utils/scoring');
const { generateQRHash } = require('../utils/qrHelper');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const LOCATIONS = [
    'Main Gate',        // P1
    'Library Entrance', // P2
    'Computer Lab A',   // P3
    'Computer Lab B',   // P4
    'Cafeteria',        // P5
    'Admin Block',      // P6
    'Sports Ground',    // P7
    'Auditorium',       // P8
    'Workshop',         // P9
    'Seminar Hall',     // P10
    'Rooftop Garden',   // P11
    'Parking Lot',      // P12
    'Reception Desk',   // P13
    'Science Lab',      // P14
    'Staff Room',       // P15
    'Electrical Room',  // P16
    'Medical Room',     // P17
    'Canteen Counter',  // P18
    'Basketball Court', // P19
    'Main Hall',        // P20
    'Water Tank Area',  // P21
    'Old Building',     // P22
    'Generator Room',   // P23
    'Roof Terrace',     // P24
];

// POST /api/seed/clues  — seeds 24 physical + 2 technical + 1 final demo clues
router.post('/clues', requireAdmin, async (req, res) => {
    try {
        const { force } = req.body;
        if (force) {
            await Clue.deleteMany({ type: { $in: ['physical', 'technical'] } });
        }

        const existingNums = new Set(
            (await Clue.find({}, 'clueNumber type')).map(c => `${c.type}-${c.clueNumber}`)
        );

        const created = [];

        // 24 Physical Clues (P1 - P24)
        for (let i = 1; i <= 24; i++) {
            const key = `physical-${i}`;
            if (existingNums.has(key)) continue;

            const diff = DIFFICULTIES[(i - 1) % DIFFICULTIES.length];
            const basePoints = diff === 'easy' ? 100 : diff === 'medium' ? 200 : 350;
            const clue = await Clue.create({
                clueNumber: i,
                type: 'physical',
                difficulty: diff,
                title: `Physical Clue ${i}`,
                clueText: `Locate the marker posted near the ${LOCATIONS[i - 1]}. Scan the QR code attached to confirm you have reached the correct location.`,
                answer: `physical${i}`,
                locationName: LOCATIONS[i - 1],
                locationCoords: { x: (i * 37) % 800, y: (i * 53) % 600 },
                points: basePoints,
                hint: `Head to the ${LOCATIONS[i - 1]} — look at eye level on walls or pillars.`,
                hasQR: true,
            });
            clue.qrHash = generateQRHash(clue._id.toString());
            await clue.save();
            created.push(clue);
        }

        // 2 Technical Clues (T1, T2)
        const techClues = [
            {
                num: 1,
                q: 'What does HTML stand for?',
                a: 'HyperText Markup Language',
                hint: 'Think about what web pages are built with.',
            },
            {
                num: 2,
                q: 'What HTTP status code means "Not Found"?',
                a: '404',
                hint: 'You\'ve probably seen this in your browser before.',
            },
        ];

        for (const tc of techClues) {
            const key = `technical-${tc.num}`;
            if (existingNums.has(key)) continue;

            const clue = await Clue.create({
                clueNumber: tc.num,
                type: 'technical',
                difficulty: 'medium',
                title: `Technical Challenge T${tc.num}`,
                clueText: tc.q,
                answer: tc.a,
                points: 200,
                hint: tc.hint,
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
                clueText: 'You have found all the clues! What is the full name of your institution? Submit the official name as it appears on the main gate.',
                answer: 'knowledge is power',
                points: 500,
                hint: 'Check the main gate signboard or the official website.',
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
            message: `Seeded ${created.length} clues, updated ${teams.length} team patterns.`,
            created: created.length,
            teamsUpdated: teams.length,
        });
    } catch (err) {
        console.error('Seed error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
