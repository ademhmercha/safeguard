import { Users, Smartphone, Clock, AlertTriangle, ChevronRight, Shield, Lock, Unlock } from 'lucide-react';
import { StatCardSkeleton } from '../components/Skeleton';
import { useOverview, useScreenTimeSummary } from '../hooks/useAnalytics';
import { useChildren } from '../hooks/useChildren';
import { useChildStore } from '../stores/childStore';
import { useLockDevice, useUnlockDevice, useDevices } from '../hooks/useDevices';
import ChildAvatar from '../components/ChildAvatar';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

function minutesToHours(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

// Compact stat tile for mobile 2x2 grid
function StatTile({ title, value, icon, gradient, loading }: {
  title: string; value: string | number; icon: React.ReactNode;
  gradient: string; loading?: boolean;
}) {
  if (loading) return <StatCardSkeleton />;
  return (
    <div className={`rounded-2xl p-4 text-white ${gradient} flex flex-col justify-between min-h-[90px]`}>
      <div className="flex items-start justify-between">
        <div className="opacity-80">{icon}</div>
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs opacity-75 mt-1 font-medium">{title}</p>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-blue-600">{minutesToHours(payload[0].value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useOverview();
  const { data: children } = useChildren();
  const { data: devices } = useDevices();
  const { selectedChildId, setSelectedChild } = useChildStore();
  const lock = useLockDevice();
  const unlock = useUnlockDevice();

  const activeChildId = selectedChildId || children?.[0]?.id || '';
  const { data: screenTimeSummary } = useScreenTimeSummary(activeChildId);

  const chartData = screenTimeSummary?.records?.map((r: { date: string; totalMinutes: number }) => ({
    date: format(new Date(r.date), 'EEE'),
    minutes: r.totalMinutes,
  })) ?? [];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">{today}</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">Overview</h1>
      </div>

      {/* 2x2 stat grid — compact on mobile */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile loading={isLoading} title="Children" value={overview?.totalChildren ?? 0}
          icon={<Users className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
        <StatTile loading={isLoading} title="Devices" value={overview?.totalDevices ?? 0}
          icon={<Smartphone className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        <StatTile loading={isLoading} title="Screen Time" value={minutesToHours(overview?.todayScreenTimeMinutes ?? 0)}
          icon={<Clock className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500" />
        <StatTile loading={isLoading} title="Alerts" value={overview?.unreadAlerts ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          gradient="bg-gradient-to-br from-red-500 to-rose-600" />
      </div>

      {/* Quick device controls */}
      {devices && devices.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Quick Controls</h2>
            <Link to="/controls" className="text-xs text-blue-600 font-medium">All controls →</Link>
          </div>
          <div className="space-y-2">
            {devices.slice(0, 3).map((device) => (
              <div key={device.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${device.isLocked ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{device.deviceName}</p>
                    <p className="text-xs text-gray-400 truncate">{device.childProfile?.name}</p>
                  </div>
                </div>
                {device.isLocked ? (
                  <button onClick={() => unlock.mutate(device.id)} disabled={unlock.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                    <Unlock className="w-3 h-3" /> Unlock
                  </button>
                ) : (
                  <button onClick={() => lock.mutate(device.id)} disabled={lock.isPending}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                    <Lock className="w-3 h-3" /> Lock
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screen time chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Screen Time</h2>
            <p className="text-xs text-gray-400">Last 7 days</p>
          </div>
          {children && children.length > 1 && (
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-600 font-medium focus:outline-none"
              value={activeChildId}
              onChange={(e) => setSelectedChild(e.target.value)}
            >
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${Math.floor(v / 60)}h`} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="minutes" stroke="#3b82f6" fill="url(#grad)" strokeWidth={2} dot={false}
                activeDot={{ r: 3, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[140px] flex flex-col items-center justify-center gap-2">
            <Clock className="w-8 h-8 text-gray-200" />
            <p className="text-xs text-gray-400">No data yet</p>
          </div>
        )}
      </div>

      {/* Children list */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Children</h2>
          <Link to="/children" className="text-xs text-blue-600 font-medium flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {children && children.length > 0 ? (
          <div className="space-y-0.5">
            {children.slice(0, 4).map((child) => (
              <Link key={child.id} to={`/children/${child.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl active:bg-gray-50 transition-colors">
                <ChildAvatar name={child.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">{child.name}</p>
                  <p className="text-xs text-gray-400">{child.age} yrs • {child.devices.length} device{child.devices.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${child.devices.some((d) => d.isLocked) ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <Shield className="w-10 h-10 text-gray-200" />
            <p className="text-sm text-gray-400">No children added yet</p>
            <Link to="/children" className="btn-primary text-sm py-2 px-4">Add child</Link>
          </div>
        )}
      </div>

    </div>
  );
}
