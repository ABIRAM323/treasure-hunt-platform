const mongoose = require('mongoose');

const clueSchema = new mongoose.Schema(
    {
        clueNumber: {
            type: Number,
            required: true,
            unique: true,
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
            enum: ['image', 'audio', 'none'],
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

module.exports = mongoose.model('Clue', clueSchema);
