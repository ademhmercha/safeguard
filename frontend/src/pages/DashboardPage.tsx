import { Users, Smartphone, Clock, AlertTriangle, ChevronRight, Shield } from 'lucide-react';
import { useOverview, useScreenTimeSummary } from '../hooks/useAnalytics';
import { useChildren } from '../hooks/useChildren';
import { useChildStore } from '../stores/childStore';
import StatCard from '../components/StatCard';
import ChildAvatar from '../components/ChildAvatar';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

function minutesToHours(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-blue-600">{minutesToHours(payload[0].value)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useOverview();
  const { data: children } = useChildren();
  const { selectedChildId, setSelectedChild } = useChildStore();

  const activeChildId = selectedChildId || children?.[0]?.id || '';
  const { data: screenTimeSummary } = useScreenTimeSummary(activeChildId);

  const chartData = screenTimeSummary?.records?.map((r: { date: string; totalMinutes: number }) => ({
    date: format(new Date(r.date), 'EEE'),
    minutes: r.totalMinutes,
    limit: screenTimeSummary.dailyLimit,
  })) ?? [];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{today}</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">Family activity overview</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-green-700">All systems active</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Children" value={isLoading ? '—' : overview?.totalChildren ?? 0}
          icon={<Users />} color="blue" />
        <StatCard title="Devices Paired" value={isLoading ? '—' : overview?.totalDevices ?? 0}
          icon={<Smartphone />} color="green" />
        <StatCard
          title="Screen Time Today"
          value={isLoading ? '—' : minutesToHours(overview?.todayScreenTimeMinutes ?? 0)}
          subtitle="All children combined"
          icon={<Clock />} color="yellow" />
        <StatCard title="Unread Alerts" value={isLoading ? '—' : overview?.unreadAlerts ?? 0}
          icon={<AlertTriangle />} color="red" />
      </div>

      {/* Chart + Children */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Screen Time</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
            </div>
            {children && children.length > 0 && (
              <select
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-gray-50 text-gray-600 font-medium"
                value={activeChildId}
                onChange={(e) => setSelectedChild(e.target.value)}
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `${Math.floor(v / 60)}h`} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="minutes" stroke="#3b82f6" fill="url(#colorMinutes)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="limit" stroke="#f87171" fill="none" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-sm text-gray-400">No screen time data yet</p>
            </div>
          )}
        </div>

        {/* Children list */}
        <div className="card flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Children</h2>
            <Link to="/children" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {children && children.length > 0 ? (
            <div className="space-y-1 flex-1">
              {children.slice(0, 5).map((child) => (
                <Link
                  key={child.id}
                  to={`/children/${child.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <ChildAvatar name={child.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{child.name}</p>
                    <p className="text-xs text-gray-400">{child.age} yrs • {child.devices.length} device{child.devices.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${child.devices.some((d) => d.isLocked) ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-sm text-gray-400 text-center">No children added yet</p>
              <Link to="/children" className="btn-primary text-sm">Add child</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
