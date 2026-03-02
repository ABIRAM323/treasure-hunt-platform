require('dotenv').config();
const mongoose = require('mongoose');
const Clue = require('../models/Clue');
const Team = require('../models/Team');
const Event = require('../models/Event');
const { generateQRHash } = require('./qrHelper');
const { buildClueOrder } = require('./scoring');

const CLUES = [
    // ─── 8 Physical Clues ───
    {
        clueNumber: 1,
        type: 'physical',
        difficulty: 'easy',
        title: 'The Gateway',
        clueText: 'Where students first enter, knowledge begins its flow. Find the board that shows what you need to know.',
        answer: 'notice board',
        locationName: 'Main Notice Board',
        locationCoords: { x: 10, y: 15 },
        points: 100,
        hint: 'Near the college main gate.',
    },
    {
        clueNumber: 2,
        type: 'physical',
        difficulty: 'easy',
        title: 'The Liquid Lab',
        clueText: 'Chemistry brews here, not coffee. Seek the place where reactions define destiny.',
        answer: 'chemistry lab',
        locationName: 'Chemistry Laboratory',
        locationCoords: { x: 30, y: 20 },
        points: 100,
        hint: 'Science block, ground floor.',
    },
    {
        clueNumber: 3,
        type: 'physical',
        difficulty: 'medium',
        title: 'The Digital Library',
        clueText: 'Where fingers tap and knowledge flows through wires, find the room that connects you to digital empires.',
        answer: 'computer lab',
        locationName: 'Computer Lab A',
        locationCoords: { x: 50, y: 25 },
        points: 200,
        hint: 'IT block, first floor.',
    },
    {
        clueNumber: 4,
        type: 'physical',
        difficulty: 'medium',
        title: 'The Thinkers Pit',
        clueText: 'Debates rage, speeches soar — this hall echoes with the future voices of law and lore.',
        answer: 'seminar hall',
        locationName: 'Seminar Hall',
        locationCoords: { x: 60, y: 40 },
        points: 200,
        hint: 'Main building, second floor.',
    },
    {
        clueNumber: 5,
        type: 'physical',
        difficulty: 'medium',
        title: 'The Power Plant',
        clueText: 'Circuits drone in eternal hum, where electricity and engineers become one.',
        answer: 'electrical lab',
        locationName: 'Electrical Engineering Lab',
        locationCoords: { x: 40, y: 60 },
        points: 200,
        hint: 'EE block, ground floor.',
    },
    {
        clueNumber: 6,
        type: 'physical',
        difficulty: 'hard',
        title: 'The Silicon Forge',
        clueText: 'Oscilloscopes glow, signals peak — only the hardware wranglers know what you seek.',
        answer: 'electronics lab',
        locationName: 'Electronics Lab',
        locationCoords: { x: 70, y: 55 },
        points: 350,
        hint: 'ECE block, first floor.',
    },
    {
        clueNumber: 7,
        type: 'physical',
        difficulty: 'hard',
        title: 'The Archive',
        clueText: 'Thousands of books, silence as thick as stone. Find where wisdom from ages past makes its home.',
        answer: 'library',
        locationName: 'Central Library',
        locationCoords: { x: 20, y: 75 },
        points: 350,
        hint: 'Near the admin block.',
    },
    {
        clueNumber: 8,
        type: 'physical',
        difficulty: 'hard',
        title: 'The Launch Pad',
        clueText: 'Where great minds pitched their boldest dreams — seek the stage of innovation and its schemes.',
        answer: 'innovation lab',
        locationName: 'Innovation & Incubation Lab',
        locationCoords: { x: 85, y: 70 },
        points: 350,
        hint: 'New block, third floor.',
    },

    // ─── 8 Technical Clues ───
    {
        clueNumber: 9,
        type: 'technical',
        difficulty: 'easy',
        title: 'Binary Basics',
        clueText: 'What is the decimal value of the binary number 1010?',
        answer: '10',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 100,
        hint: 'Count powers of 2 from right: 8+0+2+0.',
    },
    {
        clueNumber: 10,
        type: 'technical',
        difficulty: 'easy',
        title: 'The Loop Lord',
        clueText: 'In Python, what keyword is used to exit a loop immediately?',
        answer: 'break',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 100,
        hint: 'It breaks the loop.',
    },
    {
        clueNumber: 11,
        type: 'technical',
        difficulty: 'medium',
        title: 'Git It Right',
        clueText: 'What git command saves your staged changes with a message?',
        answer: 'git commit',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 200,
        hint: 'You stage first, then ___.',
    },
    {
        clueNumber: 12,
        type: 'technical',
        difficulty: 'medium',
        title: 'The Big O',
        clueText: 'What is the time complexity of binary search on a sorted array?',
        answer: 'o(log n)',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 200,
        hint: 'It halves the search space each step.',
    },
    {
        clueNumber: 13,
        type: 'technical',
        difficulty: 'medium',
        title: 'SQL Sorcerer',
        clueText: 'Which SQL clause is used to filter rows AFTER grouping?',
        answer: 'having',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 200,
        hint: 'Unlike WHERE, this works after GROUP BY.',
    },
    {
        clueNumber: 14,
        type: 'technical',
        difficulty: 'hard',
        title: 'Net Ninja',
        clueText: 'What does DNS stand for in networking?',
        answer: 'domain name system',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 350,
        hint: 'It translates names to IP addresses.',
    },
    {
        clueNumber: 15,
        type: 'technical',
        difficulty: 'hard',
        title: 'Pointer Panic',
        clueText: 'In C, what operator is used to access a member of a struct through a pointer?',
        answer: '->',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 350,
        hint: 'It looks like an arrow.',
    },
    {
        clueNumber: 16,
        type: 'technical',
        difficulty: 'hard',
        title: 'Hash Hero',
        clueText: 'What data structure provides O(1) average-case lookup time?',
        answer: 'hash table',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 350,
        hint: 'Also called a dictionary or hashmap.',
    },

    // ─── 3 Final Boss Clues ───
    {
        clueNumber: 17,
        type: 'final',
        difficulty: 'boss',
        title: 'BOSS: The Cipher',
        clueText:
            'Decode this Base64 string and give the plain text: "VGVjaEZlc3QyMDI0"',
        answer: 'techfest2024',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 500,
        hint: 'Use any Base64 decoder tool.',
    },
    {
        clueNumber: 18,
        type: 'final',
        difficulty: 'boss',
        title: 'BOSS: The Algorithm',
        clueText:
            'A sorted array has N elements. How many comparisons does binary search make in the WORST case? Answer in terms of N (use log base 2, write as: ceil(log2(N))+1)',
        answer: 'ceil(log2(n))+1',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 500,
        hint: 'Think about how many times you can halve N.',
    },
    {
        clueNumber: 19,
        type: 'final',
        difficulty: 'boss',
        title: 'BOSS: The Protocol',
        clueText:
            'What HTTP status code means "Too Many Requests" (rate limiting)? Answer with just the number.',
        answer: '429',
        locationName: '',
        locationCoords: { x: 0, y: 0 },
        points: 500,
        hint: 'Between 400 and 430.',
    },
];

const SAMPLE_TEAMS = [
    { teamId: 'TEAM01', name: 'Cipher Squad', password: 'cipher123', members: [{ name: 'Alice', role: 'Leader' }, { name: 'Bob', role: 'Dev' }, { name: 'Carol', role: 'Dev' }, { name: 'Dave', role: 'Analyst' }] },
    { teamId: 'TEAM02', name: 'Byte Force', password: 'byteforce456', members: [{ name: 'Eve', role: 'Leader' }, { name: 'Frank', role: 'Dev' }, { name: 'Grace', role: 'Dev' }, { name: 'Hank', role: 'Analyst' }] },
    { teamId: 'TEAM03', name: 'Neural Ninjas', password: 'neural789', members: [{ name: 'Ivy', role: 'Leader' }, { name: 'Jack', role: 'Dev' }, { name: 'Kate', role: 'Dev' }, { name: 'Leo', role: 'Analyst' }] },
    { teamId: 'TEAM04', name: 'Stack Overflow', password: 'stack000', members: [{ name: 'Mia', role: 'Leader' }, { name: 'Noah', role: 'Dev' }, { name: 'Olivia', role: 'Dev' }, { name: 'Pete', role: 'Analyst' }] },
    { teamId: 'TEAM05', name: 'Kernel Panic', password: 'kernel111', members: [{ name: 'Quinn', role: 'Leader' }, { name: 'Ruby', role: 'Dev' }, { name: 'Sam', role: 'Dev' }, { name: 'Tina', role: 'Analyst' }] },
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

    // Insert clues
    const insertedClues = await Clue.insertMany(CLUES);
    console.log(`✅ Inserted ${insertedClues.length} clues`);

    // Update QR hashes for physical clues
    for (const clue of insertedClues) {
        if (clue.type === 'physical') {
            clue.qrHash = generateQRHash(clue._id.toString());
            await clue.save();
        }
    }
    console.log('✅ QR hashes generated for physical clues');

    // Categorize clues
    const physicalClues = insertedClues.filter((c) => c.type === 'physical');
    const technicalClues = insertedClues.filter((c) => c.type === 'technical');
    const finalClues = insertedClues.filter((c) => c.type === 'final');

    // Insert sample teams with randomized clue orders
    for (const teamData of SAMPLE_TEAMS) {
        const clueOrder = buildClueOrder(physicalClues, technicalClues, finalClues);
        await Team.create({ ...teamData, clueOrder });
    }
    console.log(`✅ Inserted ${SAMPLE_TEAMS.length} sample teams`);

    // Create default event
    await Event.create({});
    console.log('✅ Created default event');

    console.log('\n🎉 Database seeded!');
    console.log('Admin:', process.env.ADMIN_USERNAME, '/', process.env.ADMIN_PASSWORD);
    console.log('Teams:', SAMPLE_TEAMS.map((t) => `${t.teamId}/${t.password}`).join('  '));
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
