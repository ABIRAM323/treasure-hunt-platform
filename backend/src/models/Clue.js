const mongoose = require('mongoose');

const clueSchema = new mongoose.Schema(
    {
        clueNumber: {
            type: Number,
            required: true,
            // Uniqueness enforced by compound index below: (clueNumber + type)
            // This allows P1 and T1 to coexist in the database
        },
        type: {
            type: String,
            enum: ['physical', 'technical', 'final'],
            required: true,
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard', 'boss'],
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        clueText: {
            type: String,
            required: true,
        },
        answer: {
            type: String,
            required: true,
            select: false, // Never leak answer to frontend
        },
        qrHash: {
            type: String,
            select: false, // Never leak QR hash to frontend
        },
        hasQR: {
            type: Boolean,
            default: true,
        },
        mediaType: {
            type: String,
            enum: ['image', 'audio', 'video', 'none'],
            default: 'none',
        },
        mediaUrl: {
            type: String,
            default: '',
        },
        locationName: {
            type: String,
            default: '',
        },
        locationCoords: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
        },
        points: {
            type: Number,
            required: true,
        },
        hint: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Compound unique index: P1 (physical, 1), T1 (technical, 1), F1 (final, 1) can all coexist
clueSchema.index({ clueNumber: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Clue', clueSchema);
