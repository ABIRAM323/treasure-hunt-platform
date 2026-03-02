import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Connects to whichever host is serving this page (works with ngrok, Render, localhost)
const SOCKET_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');


export function SocketProvider({ children }) {
    const { token } = useAuth();
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [timerState, setTimerState] = useState({ remaining: 0, duration: 0, isRunning: false });
    const [eventState, setEventState] = useState({ isRunning: false, isLocked: false });

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => setConnected(true));
        socket.on('disconnect', () => setConnected(false));

        socket.on('leaderboard:update', (data) => setLeaderboard(data));

        socket.on('timer:tick', ({ remaining, duration }) => {
            setTimerState((prev) => ({ ...prev, remaining, duration, isRunning: true }));
        });

        socket.on('event:start', ({ startTime, duration }) => {
            setEventState({ isRunning: true, isLocked: false });
            setTimerState({ remaining: duration, duration, isRunning: true });
        });

        socket.on('event:stop', () => {
            setEventState({ isRunning: false, isLocked: true });
            setTimerState((prev) => ({ ...prev, isRunning: false }));
        });

        socket.on('event:reset', () => {
            setEventState({ isRunning: false, isLocked: false });
            setTimerState({ remaining: 0, duration: 0, isRunning: false });
        });

        socket.on('event:state', (data) => {
            setEventState({ isRunning: data.isRunning, isLocked: data.isLocked });
            if (data.isRunning && data.startTime) {
                const elapsed = Date.now() - new Date(data.startTime).getTime();
                const remaining = Math.max(0, data.duration - elapsed);
                setTimerState({ remaining, duration: data.duration, isRunning: true });
            }
        });

        return () => socket.disconnect();
    }, [token]);

    const emit = (event, data) => socketRef.current?.emit(event, data);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected, leaderboard, timerState, eventState, emit }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
