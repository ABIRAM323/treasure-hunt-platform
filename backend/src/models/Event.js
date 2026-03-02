const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
    {
        startTime: {
            type: Date,
            default: null,
        },
        duration: {
            type: Number,
            default: 3 * 60 * 60 * 1000, // 3 hours in ms
        },
        isRunning: {
            type: Boolean,
            default: false,
        },
        isLocked: {
            type: Boolean,
            default: false,
        },
        name: {
            type: String,
            default: 'Tech Fest Treasure Hunt 2024',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
