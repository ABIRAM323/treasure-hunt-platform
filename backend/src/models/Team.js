const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teamSchema = new mongoose.Schema(
    {
        teamId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        members: [
            {
                name: String,
                role: String,
            },
        ],
        score: {
            type: Number,
            default: 0,
        },
        currentClueIndex: {
            type: Number,
            default: 0,
        },
        clueOrder: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Clue',
            },
        ],
        usedClues: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Clue',
            },
        ],
        lastLocation: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['waiting', 'searching', 'completed', 'final', 'finished'],
            default: 'waiting',
        },
        startTime: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

// Hash password before saving
teamSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare passwords
teamSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual: current clue id
teamSchema.virtual('currentClueId').get(function () {
    if (this.clueOrder && this.clueOrder.length > this.currentClueIndex) {
        return this.clueOrder[this.currentClueIndex];
    }
    return null;
});

teamSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Team', teamSchema);
