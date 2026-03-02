const Event = require('../models/Event');
const Team = require('../models/Team');

let timerInterval = null;

const initSocket = (io) => {
    io.on('connection', async (socket) => {
        console.log(`🔌 Client connected: ${socket.id}`);

        // Send current event state on connect
        try {
            const event = await Event.findOne();
            if (event) {
                socket.emit('event:state', {
                    startTime: event.startTime,
                    duration: event.duration,
                    isRunning: event.isRunning,
                    isLocked: event.isLocked,
                });
            }

            // Send current leaderboard
            const teams = await Team.find(
                {},
                'teamId name score status currentClueIndex lastLocation members completedAt'
            )
                .sort({ score: -1, completedAt: 1 })
                .lean();
            socket.emit('leaderboard:update', teams);
        } catch (err) {
            console.error('Socket init error:', err.message);
        }

        // Admin requests real-time progress
        socket.on('admin:subscribe', () => {
            socket.join('admin-room');
        });

        // Team subscribes to their own updates
        socket.on('team:subscribe', (teamId) => {
            socket.join(`team-${teamId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    // Start timer broadcast interval
    startTimerBroadcast(io);
};

// Broadcast timer tick every second
const startTimerBroadcast = (io) => {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(async () => {
        try {
            const event = await Event.findOne();
            if (!event || !event.isRunning) return;

            const elapsed = Date.now() - new Date(event.startTime).getTime();
            const remaining = Math.max(0, event.duration - elapsed);

            io.emit('timer:tick', { remaining, elapsed, duration: event.duration });

            // Auto-lock when time is up
            if (remaining === 0 && !event.isLocked) {
                event.isRunning = false;
                event.isLocked = true;
                await event.save();
                io.emit('event:stop', { message: 'Time is up! Event has ended.' });
            }
        } catch (err) {
            // Silently ignore db errors during interval
        }
    }, 1000);
};

module.exports = initSocket;
