import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import TeamLogin from './pages/TeamLogin';
import AdminLogin from './pages/AdminLogin';
import TeamDashboard from './pages/TeamDashboard';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import EntityHallucinations from './components/EntityHallucinations';
import RiftOverlay from './components/RiftOverlay';

function ProtectedTeamRoute({ children }) {
  const { isTeam } = useAuth();
  return isTeam ? children : <Navigate to="/login" replace />;
}

function ProtectedAdminRoute({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/admin/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<TeamLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedTeamRoute>
            <TeamDashboard />
          </ProtectedTeamRoute>
        }
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedAdminRoute>
            <AdminDashboard />
          </ProtectedAdminRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="app-container">
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <div className="crt-overlay"></div>
            <div className="flicker-overlay"></div>
            <div className="veins-overlay"></div>
            <EntityHallucinations />
            <RiftOverlay />
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </div>
  );
}
