import { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const savedUser = (() => {
        try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
    })();

    const [user, setUser] = useState(savedUser);
    const [token, setToken] = useState(localStorage.getItem('token'));

    const teamLogin = useCallback(async (teamId, password) => {
        const { data } = await api.post('/auth/team-login', { teamId, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ ...data.team, role: 'team' }));
        setToken(data.token);
        setUser({ ...data.team, role: 'team' });
        return data;
    }, []);

    const adminLogin = useCallback(async (username, password) => {
        const { data } = await api.post('/auth/admin-login', { username, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ ...data.admin, role: 'admin' }));
        setToken(data.token);
        setUser({ ...data.admin, role: 'admin' });
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    const isTeam = user?.role === 'team';
    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, teamLogin, adminLogin, logout, isTeam, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
