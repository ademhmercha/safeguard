import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ChildrenPage from './pages/ChildrenPage';
import ChildDetailPage from './pages/ChildDetailPage';
import DevicesPage from './pages/DevicesPage';
import ScreenTimePage from './pages/ScreenTimePage';
import AppUsagePage from './pages/AppUsagePage';
import ControlsPage from './pages/ControlsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import ActivityPage from './pages/ActivityPage';
import BrowserHistoryPage from './pages/BrowserHistoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="children" element={<ChildrenPage />} />
          <Route path="children/:id" element={<ChildDetailPage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="screen-time" element={<ScreenTimePage />} />
          <Route path="app-usage" element={<AppUsagePage />} />
          <Route path="controls" element={<ControlsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="browser-history" element={<BrowserHistoryPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
