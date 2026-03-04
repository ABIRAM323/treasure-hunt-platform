/**
 * Scoring Engine for the Treasure Hunt Platform
 * 
 * Base points by difficulty:
 *   easy      = 100
 *   medium    = 200
 *   hard      = 350
 *   boss      = 500
 * 
 * Time bonus: linear decay over event duration
 *   timeBonus = basePoints * 0.5 * (1 - elapsed/duration)
 * 
 * Wrong attempt penalty: -15 per wrong attempt (max 80% deduction)
 * Final Boss bonus: +500 on completion
 */

const BASE_POINTS = {
    easy: 100,
    medium: 200,
    hard: 350,
    boss: 500,
};

/**
 * Calculate score for solving a clue
 * @param {string} difficulty - clue difficulty
 * @param {number} attemptCount - number of wrong attempts made BEFORE this correct one
 * @param {Date|null} eventStartTime - when the event started
 * @param {number} eventDuration - event duration in ms
 * @returns {{ basePoints, timeBonus, penalty, total }}
 */
const calculateScore = (difficulty, attemptCount = 0, eventStartTime = null, eventDuration = 3 * 60 * 60 * 1000) => {
    const basePoints = BASE_POINTS[difficulty] || 100;

    // Time bonus if event is running
    let timeBonus = 0;
    if (eventStartTime) {
        const elapsed = Date.now() - new Date(eventStartTime).getTime();
        const remaining = Math.max(0, 1 - elapsed / eventDuration);
        timeBonus = Math.floor(basePoints * 0.5 * remaining);
    }

    // Wrong attempt penalty: 15 pts per wrong attempt, max 80% of base
    const maxPenalty = Math.floor(basePoints * 0.8);
    const penalty = Math.min(attemptCount * 15, maxPenalty);

    const total = Math.max(0, basePoints + timeBonus - penalty);

    return { basePoints, timeBonus, penalty, total };
};

/**
 * Calculate Final Boss completion bonus
 * Applied when all final boss clues are completed
 */
const FINAL_BOSS_BONUS = 500;

const CUSTOM_PATTERNS = [
    ['P6', 'T3', 'P12', 'T11', 'P9', 'T8', 'P5', 'T6'], // Team 1
    ['P2', 'T9', 'P13', 'T12', 'P10', 'T9', 'P6', 'T7'], // Team 2
    ['P8', 'T1', 'P11', 'T13', 'P11', 'T10', 'P7', 'T8'], // Team 3
    ['P1', 'T5', 'P7', 'T3', 'P8', 'T11', 'P8', 'T9'], // Team 4
    ['P9', 'T7', 'P5', 'T2', 'P12', 'T12', 'P9', 'T10'], // Team 5
    ['P4', 'T4', 'P3', 'T6', 'P1', 'T13', 'P10', 'T11'], // Team 6
    ['P10', 'T2', 'P6', 'T5', 'P2', 'T1', 'P11', 'T12'], // Team 7
    ['P5', 'T6', 'P4', 'T7', 'P3', 'T2', 'P12', 'T13'], // Team 8
    ['P3', 'T8', 'P2', 'T4', 'P4', 'T3', 'P13', 'T1'], // Team 9
    ['P7', 'T10', 'P1', 'T1', 'P5', 'T4', 'P1', 'T5'], // Team 10
];

/**
 * Get clue distribution for a team using a shifted cyclic pattern or custom pattern.
 * Each team starts at a different physical/technical clue to prevent bunching.
 * @param {Array} physicalClues - array of physical clue docs
 * @param {Array} technicalClues - array of technical clue docs
 * @param {Array} finalClues - array of final boss clue docs
 * @param {number} teamIndex - used to calculate the starting clue shift
 * @returns {Array} ordered clue IDs
 */
const buildClueOrder = (physicalClues, technicalClues, finalClues, teamIndex = 0) => {
    // Check if within custom patterns range
    if (teamIndex >= 0 && teamIndex < CUSTOM_PATTERNS.length) {
        const pattern = CUSTOM_PATTERNS[teamIndex];
        const orderedClues = [];

        for (const identifier of pattern) {
            const typeLetter = identifier[0]; // 'P' or 'T'
            const num = parseInt(identifier.substring(1));
            const type = typeLetter === 'P' ? 'physical' : 'technical';

            const clue = (type === 'physical' ? physicalClues : technicalClues).find(c => c.clueNumber === num);
            if (clue) {
                orderedClues.push(clue._id);
            }
        }

        // Add final boss clues
        const sortedFinal = finalClues.sort((a, b) => a.clueNumber - b.clueNumber);
        return [...orderedClues, ...sortedFinal.map(c => c._id)];
    }

    // Sort clues by number
    const sortedP = [...physicalClues].sort((a, b) => a.clueNumber - b.clueNumber);
    const sortedT = [...technicalClues].sort((a, b) => a.clueNumber - b.clueNumber);

    // Interleave P and T: P1, T1, P2, T2...
    const interleaved = [];
    const maxLength = Math.max(sortedP.length, sortedT.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < sortedP.length) interleaved.push(sortedP[i]);
        if (i < sortedT.length) interleaved.push(sortedT[i]);
    }

    if (interleaved.length === 0) {
        return finalClues.sort((a, b) => a.clueNumber - b.clueNumber).map((c) => c._id);
    }

    // Shift the pattern cyclically based on the team's index (shifting by pairs)
    const pairsCount = Math.floor(interleaved.length / 2);
    const shiftPairs = pairsCount > 0 ? (Math.max(0, teamIndex) % pairsCount) : 0;
    const shiftIndex = shiftPairs * 2;

    // Build the shifted array, taking only the first 8 clues (4 P, 4 T)
    const shiftedNormalClues = [
        ...interleaved.slice(shiftIndex),
        ...interleaved.slice(0, shiftIndex)
    ].slice(0, 8);

    // Final boss clues come at the end, sorted deterministically
    const sortedFinal = finalClues.sort((a, b) => a.clueNumber - b.clueNumber);

    return [...shiftedNormalClues, ...sortedFinal].map((c) => c._id);
};

/**
 * Determine if Final Boss should be unlocked
 * Unlock when 100% of physical+technical clues are completed
 * @param {number} completedCount 
 * @param {number} totalPhysicalTechnical 
 */
const isFinalBossUnlocked = (completedCount, totalPhysicalTechnical) => {
    return completedCount >= totalPhysicalTechnical;
};

module.exports = { calculateScore, buildClueOrder, isFinalBossUnlocked, FINAL_BOSS_BONUS };
