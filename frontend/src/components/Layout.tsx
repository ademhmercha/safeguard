import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Shield, LayoutDashboard, Users, Smartphone, Clock,
  BarChart2, Settings2, Bell, LogOut, Lock, Globe, Activity, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useUnreadCount } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/children', icon: Users, label: 'Children' },
      { to: '/devices', icon: Smartphone, label: 'Devices' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/screen-time', icon: Clock, label: 'Screen Time' },
      { to: '/app-usage', icon: BarChart2, label: 'App Usage' },
      { to: '/controls', icon: Lock, label: 'Controls' },
    ],
  },
  {
    label: 'Activity',
    items: [
      { to: '/activity', icon: Activity, label: 'Activity' },
      { to: '/browser-history', icon: Globe, label: 'Browser History' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/notifications', icon: Bell, label: 'Notifications' },
      { to: '/settings', icon: Settings2, label: 'Settings' },
    ],
  },
];

// Bottom nav items for mobile (most used)
const bottomNav = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/children', icon: Users, label: 'Children' },
  { to: '/controls', icon: Lock, label: 'Controls' },
  { to: '/notifications', icon: Bell, label: 'Alerts' },
  { to: '/devices', icon: Smartphone, label: 'Devices' },
];

const sidebarBg = 'linear-gradient(175deg, #0c1322 0%, #0e1828 100%)';

function SidebarContent({ onClose, user, unread, onLogout }: {
  onClose?: () => void;
  user: { name?: string; email?: string } | null;
  unread: { count?: number } | undefined;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-tight">SafeGuard</p>
            <p className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#3b82f680' }}>Parental Control</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden">
            <X className="w-4 h-4 text-white/50" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${
                      isActive ? 'text-blue-300' : 'hover:bg-white/5'
                    }`
                  }
                  style={({ isActive }) => isActive ? { background: 'rgba(59,130,246,0.15)' } : {}}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-blue-400" />}
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.4)' }} />
                      <span style={{ color: isActive ? '#bfdbfe' : 'rgba(255,255,255,0.45)' }}>{label}</span>
                      {label === 'Notifications' && (unread?.count ?? 0) > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {(unread?.count ?? 0) > 9 ? '9+' : unread?.count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>{user?.email}</p>
          </div>
          <button onClick={onLogout} className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20" title="Sign out" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: unread } = useUnreadCount();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`parent:${user.id}`)
      .on('broadcast', { event: 'blocked_site' }, ({ payload }) => {
        toast.error(`🚫 ${payload.childName} tried to visit ${payload.domain}`, {
          duration: 6000,
          style: { fontWeight: '600', maxWidth: '380px' },
        });
        qc.invalidateQueries({ queryKey: ['notifications-unread'] });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user?.id, qc]);

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div className="flex h-screen bg-slate-50">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0" style={{ background: sidebarBg }}>
        <SidebarContent user={user} unread={unread} onLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col z-10" style={{ background: sidebarBg }}>
            <SidebarContent user={user} unread={unread} onLogout={handleLogout} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">SafeGuard</span>
          </div>
          {(unread?.count ?? 0) > 0 && (
            <NavLink to="/notifications" className="relative p-2">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </NavLink>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around px-2 py-1">
            {bottomNav.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {label === 'Alerts' && (unread?.count ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
