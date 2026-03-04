require('dotenv').config();
const mongoose = require('mongoose');
const Clue = require('../models/Clue');
const Team = require('../models/Team');
const Event = require('../models/Event');
const { generateQRHash } = require('./qrHelper');
const { buildClueOrder } = require('./scoring');

// ─── 24 Physical Clues (P1 – P24) ─────────────────────────────────────────
// Matching team patterns: P1–P24 used in custom team routes
const PHYSICAL_CLUES = [
    { clueNumber: 1, locationName: 'Main Gate', clueText: 'The first face of the campus greets every visitor. Find the marker near the entrance arch and scan to proceed.', hint: 'Stand at the main entrance gate.' },
    { clueNumber: 2, locationName: 'Library Entrance', clueText: 'Where books never sleep and knowledge runs deep. Look near the library door for your next step.', hint: 'Central Library main door.' },
    { clueNumber: 3, locationName: 'Computer Lab A', clueText: 'Rows of machines awaiting commands. The marker is near the door of the first computer lab you see.', hint: 'IT block, ground floor — Lab A.' },
    { clueNumber: 4, locationName: 'Computer Lab B', clueText: 'Another hall of silicon and screens. Check the second computer lab for your clue.', hint: 'IT block, first floor — Lab B.' },
    { clueNumber: 5, locationName: 'Cafeteria', clueText: 'Fuelled by samosas and chai — the heart of student life awaits your visit. Check near the food counter.', hint: 'Main cafeteria, near the counter.' },
    { clueNumber: 6, locationName: 'Admin Block', clueText: 'Where forms get stamped and decisions get made. Find the marker near the administration office.', hint: 'Ground floor, admin corridor.' },
    { clueNumber: 7, locationName: 'Sports Ground', clueText: 'Where champions are built one lap at a time. Check the boundary wall near the sports ground entrance.', hint: 'Main sports ground entrance gate.' },
    { clueNumber: 8, locationName: 'Auditorium', clueText: 'A stage for ideas and applause. Find the marker near the auditorium entrance.', hint: 'Main auditorium doors.' },
    { clueNumber: 9, locationName: 'Workshop', clueText: 'Lathes and drills and sawdust in the air. The clue is near the workshop entrance.', hint: 'Mechanical workshop, ground floor.' },
    { clueNumber: 10, locationName: 'Seminar Hall', clueText: 'Great talks happen here. Look near the seminar hall entrance for your marker.', hint: 'Seminar hall on the second floor.' },
    { clueNumber: 11, locationName: 'Rooftop Garden', clueText: 'High above the chaos, green things grow. Climb to the rooftop garden and find your marker.', hint: 'Rooftop terrace with plants.' },
    { clueNumber: 12, locationName: 'Parking Lot', clueText: 'Bikes and cars await their owners here. Check the parking lot entrance board for your clue.', hint: 'Main parking lot entrance.' },
    { clueNumber: 13, locationName: 'Reception Desk', clueText: 'The face of the institution. The marker is at the main reception near the lobby.', hint: 'Main lobby reception.' },
    { clueNumber: 14, locationName: 'Science Lab', clueText: 'Bunsen burners and beakers whisper secrets. Check outside the science lab door.', hint: 'Science block, second floor.' },
    { clueNumber: 15, locationName: 'Staff Room', clueText: 'Where teachers gather between battles. The marker is on the wall near the staff room.', hint: 'Staff room corridor, main block.' },
    { clueNumber: 16, locationName: 'Electrical Room', clueText: 'Switches and wires power the whole campus. Find the marker near the electrical room door.', hint: 'Electrical room, basement.' },
    { clueNumber: 17, locationName: 'Medical Room', clueText: 'First aid and care are dispensed here. Check the board near the medical room entrance.', hint: 'Campus medical room.' },
    { clueNumber: 18, locationName: 'Canteen Counter', clueText: 'Snacks fuel champions. The marker is behind the canteen counter board.', hint: 'Inner canteen serving counter.' },
    { clueNumber: 19, locationName: 'Basketball Court', clueText: 'Three-pointers and fast breaks happen here. Look near the basketball court sideline board.', hint: 'Basketball court entrance.' },
    { clueNumber: 20, locationName: 'Main Hall', clueText: 'Convocations and celebrations happen in this grand hall. Find the marker near the main hall entrance.', hint: 'Main hall entrance lobby.' },
    { clueNumber: 21, locationName: 'Water Tank Area', clueText: 'Life-giving water is stored above. Near the water tank structure is your next clue.', hint: 'Water tank room, ground level.' },
    { clueNumber: 22, locationName: 'Old Building', clueText: 'History lives in these old walls. Find the marker placed on the old building facade.', hint: 'Old building main corridor.' },
    { clueNumber: 23, locationName: 'Generator Room', clueText: 'When power fails, this room saves the day. Check the generator room door for a marker.', hint: 'Generator shed, back of campus.' },
    { clueNumber: 24, locationName: 'Roof Terrace', clueText: 'The highest ground on campus, where sky meets ambition. Your final physical marker is here.', hint: 'Roof terrace of the main building.' },
].map((p, i) => ({
    clueNumber: p.clueNumber,
    type: 'physical',
    difficulty: i < 8 ? 'easy' : i < 16 ? 'medium' : 'hard',
    title: `Physical Clue ${p.clueNumber}: ${p.locationName}`,
    clueText: p.clueText,
    answer: `physical${p.clueNumber}`,
    locationName: p.locationName,
    locationCoords: { x: (p.clueNumber * 37) % 800, y: (p.clueNumber * 53) % 600 },
    points: i < 8 ? 100 : i < 16 ? 200 : 350,
    hint: p.hint,
    hasQR: true,
}));

// ─── 2 Technical Clues (T1, T2) ────────────────────────────────────────────
const TECHNICAL_CLUES = [
    {
        clueNumber: 1,
        type: 'technical',
        difficulty: 'medium',
        title: 'Technical Challenge T1: Web Basics',
        clueText: 'What does HTML stand for?',
        answer: 'HyperText Markup Language',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 200,
        hint: 'Think about what web pages are structured with — Hyper, Text, Markup...',
        hasQR: false,
    },
    {
        clueNumber: 2,
        type: 'technical',
        difficulty: 'medium',
        title: 'Technical Challenge T2: HTTP Status',
        clueText: 'What HTTP status code means "Not Found"? (Enter just the number)',
        answer: '404',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 200,
        hint: 'You\'ve probably seen this error in your browser when a page is missing.',
        hasQR: false,
    },
];

// ─── 1 Final Boss Clue (F) ──────────────────────────────────────────────────
const FINAL_CLUES = [
    {
        clueNumber: 1,
        type: 'final',
        difficulty: 'boss',
        title: 'FINAL BOSS: The Ultimate Challenge',
        clueText: 'You have conquered every location and solved every puzzle. One final challenge remains.\n\nWhat is the full official name of your institution, exactly as it appears on the main gate? Submit it in ALL CAPS.',
        answer: '',   // admin should update with actual institution name
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 500,
        hint: 'Look at the main gate signboard or the official website header.',
        hasQR: false,
    },
];

const CLUES = [...PHYSICAL_CLUES, ...TECHNICAL_CLUES, ...FINAL_CLUES];

const SAMPLE_TEAMS = [
    { teamId: 'TEAM01', name: 'Cipher Squad', password: 'cipher123', members: [{ name: 'Alice', role: 'Leader' }, { name: 'Bob', role: 'Dev' }] },
    { teamId: 'TEAM02', name: 'Byte Force', password: 'byteforce456', members: [{ name: 'Eve', role: 'Leader' }, { name: 'Frank', role: 'Dev' }] },
    { teamId: 'TEAM03', name: 'Neural Ninjas', password: 'neural789', members: [{ name: 'Ivy', role: 'Leader' }, { name: 'Jack', role: 'Dev' }] },
    { teamId: 'TEAM04', name: 'Stack Overflow', password: 'stack000', members: [{ name: 'Mia', role: 'Leader' }, { name: 'Noah', role: 'Dev' }] },
    { teamId: 'TEAM05', name: 'Kernel Panic', password: 'kernel111', members: [{ name: 'Quinn', role: 'Leader' }, { name: 'Ruby', role: 'Dev' }] },
    { teamId: 'TEAM06', name: 'Null Pointers', password: 'nullptr222', members: [{ name: 'Sam', role: 'Leader' }, { name: 'Tina', role: 'Dev' }] },
    { teamId: 'TEAM07', name: 'Root Access', password: 'root333', members: [{ name: 'Uma', role: 'Leader' }, { name: 'Victor', role: 'Dev' }] },
    { teamId: 'TEAM08', name: 'Bit Shifters', password: 'bitshift444', members: [{ name: 'Wendy', role: 'Leader' }, { name: 'Xander', role: 'Dev' }] },
    { teamId: 'TEAM09', name: 'Hex Hunters', password: 'hexhunt555', members: [{ name: 'Yara', role: 'Leader' }, { name: 'Zane', role: 'Dev' }] },
    { teamId: 'TEAM10', name: 'Logic Bombers', password: 'logic666', members: [{ name: 'Aaron', role: 'Leader' }, { name: 'Beth', role: 'Dev' }] },
];

/**
 * Core seed logic — can be called programmatically or via CLI.
 * Does NOT connect to MongoDB (assumes connection is already open).
 */
const seedDatabase = async () => {
    // Clear existing data
    await Clue.deleteMany({});
    await Team.deleteMany({});
    await Event.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Insert clues (27 total: 24P + 2T + 1F)
    const insertedClues = await Clue.insertMany(CLUES);
    console.log(`✅ Inserted ${insertedClues.length} clues (24 Physical + 2 Technical + 1 Final)`);

    // Generate QR hashes
    for (const clue of insertedClues) {
        clue.qrHash = generateQRHash(clue._id.toString());
        await clue.save();
    }
    console.log('✅ QR hashes generated');

    // Categorize clues
    const physicalClues = insertedClues.filter(c => c.type === 'physical');
    const technicalClues = insertedClues.filter(c => c.type === 'technical');
    const finalClues = insertedClues.filter(c => c.type === 'final');

    // Insert 10 sample teams with correct custom patterns
    for (let idx = 0; idx < SAMPLE_TEAMS.length; idx++) {
        const clueOrder = buildClueOrder(physicalClues, technicalClues, finalClues, idx);
        await Team.create({ ...SAMPLE_TEAMS[idx], clueOrder });
    }
    console.log(`✅ Inserted ${SAMPLE_TEAMS.length} sample teams with correct patterns`);

    // Create default event
    await Event.create({});
    console.log('✅ Created default event');

    console.log('\n🎉 Database seeded!');
    console.log('Admin:', process.env.ADMIN_USERNAME, '/', process.env.ADMIN_PASSWORD);
    console.log('Teams:', SAMPLE_TEAMS.map(t => `${t.teamId}/${t.password}`).join('  '));
};

// CLI entrypoint: node src/utils/seeder.js
if (require.main === module) {
    (async () => {
        try {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/treasurehunt');
            console.log('✅ MongoDB connected for seeding');
            await seedDatabase();
            process.exit(0);
        } catch (err) {
            console.error('❌ Seeding failed:', err.message);
            process.exit(1);
        }
    })();
}

module.exports = { seedDatabase, CLUES, SAMPLE_TEAMS };
