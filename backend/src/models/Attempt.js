const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema(
    {
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team',
            required: true,
        },
        clueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clue',
            required: true,
        },
        attemptCount: {
            type: Number,
            default: 0,
        },
        isCorrect: {
            type: Boolean,
            default: false,
        },
        lastAttemptAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

// Compound index to quickly find attempts per team per clue
attemptSchema.index({ teamId: 1, clueId: 1 }, { unique: true });

module.exports = mongoose.model('Attempt', attemptSchema);
