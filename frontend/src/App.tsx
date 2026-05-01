import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import { CardSkeleton } from './components/Skeleton';

const LandingPage      = lazy(() => import('./pages/LandingPage'));
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const RegisterPage     = lazy(() => import('./pages/RegisterPage'));
const DashboardPage    = lazy(() => import('./pages/DashboardPage'));
const ChildrenPage     = lazy(() => import('./pages/ChildrenPage'));
const ChildDetailPage  = lazy(() => import('./pages/ChildDetailPage'));
const DevicesPage      = lazy(() => import('./pages/DevicesPage'));
const ScreenTimePage   = lazy(() => import('./pages/ScreenTimePage'));
const AppUsagePage     = lazy(() => import('./pages/AppUsagePage'));
const ControlsPage     = lazy(() => import('./pages/ControlsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage     = lazy(() => import('./pages/SettingsPage'));
const ActivityPage     = lazy(() => import('./pages/ActivityPage'));
const BrowserHistoryPage = lazy(() => import('./pages/BrowserHistoryPage'));

function PageLoader() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <CardSkeleton />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}>
        <Routes>
          <Route path="/home" element={<LandingPage />} />
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
            <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path="children" element={<Suspense fallback={<PageLoader />}><ChildrenPage /></Suspense>} />
            <Route path="children/:id" element={<Suspense fallback={<PageLoader />}><ChildDetailPage /></Suspense>} />
            <Route path="devices" element={<Suspense fallback={<PageLoader />}><DevicesPage /></Suspense>} />
            <Route path="screen-time" element={<Suspense fallback={<PageLoader />}><ScreenTimePage /></Suspense>} />
            <Route path="app-usage" element={<Suspense fallback={<PageLoader />}><AppUsagePage /></Suspense>} />
            <Route path="controls" element={<Suspense fallback={<PageLoader />}><ControlsPage /></Suspense>} />
            <Route path="activity" element={<Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>} />
            <Route path="browser-history" element={<Suspense fallback={<PageLoader />}><BrowserHistoryPage /></Suspense>} />
            <Route path="notifications" element={<Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
