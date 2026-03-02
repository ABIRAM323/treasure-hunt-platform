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
 * Get clue distribution for a team (randomized order)
 * Physical + Technical interleaved, Final Boss at end
 * @param {Array} physicalClues - array of physical clue docs
 * @param {Array} technicalClues - array of technical clue docs
 * @param {Array} finalClues - array of final boss clue docs
 * @returns {Array} ordered clue IDs
 */
const buildClueOrder = (physicalClues, technicalClues, finalClues) => {
    // Shuffle physical and technical clues
    const shuffled = [...physicalClues, ...technicalClues].sort(() => Math.random() - 0.5);
    // Final boss clues come at the end
    return [...shuffled, ...finalClues].map((c) => c._id);
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
