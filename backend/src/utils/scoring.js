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

/**
 * Get clue distribution for a team using a shifted cyclic pattern.
 * Each team starts at a different physical/technical clue to prevent bunching.
 * @param {Array} physicalClues - array of physical clue docs
 * @param {Array} technicalClues - array of technical clue docs
 * @param {Array} finalClues - array of final boss clue docs
 * @param {number} teamIndex - used to calculate the starting clue shift
 * @returns {Array} ordered clue IDs
 */
const buildClueOrder = (physicalClues, technicalClues, finalClues, teamIndex = 0) => {
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
    ].slice(0, 8); // LIMIT to exactly 8 clues per the user pattern

    // Final boss clues come at the end, sorted deterministically
    const sortedFinal = finalClues.sort((a, b) => a.clueNumber - b.clueNumber);

    return [...shiftedNormalClues, ...sortedFinal].map((c) => c._id);
};

/**
 * Determine if Final Boss should be unlocked
 * Unlock when 70% of physical+technical clues are completed
 * @param {number} completedCount 
 * @param {number} totalPhysicalTechnical 
 */
const isFinalBossUnlocked = (completedCount, totalPhysicalTechnical) => {
    return completedCount >= Math.ceil(totalPhysicalTechnical * 0.7);
};

module.exports = { calculateScore, buildClueOrder, isFinalBossUnlocked, FINAL_BOSS_BONUS };
