import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useChild } from '../hooks/useChildren';
import { useScreenTimeSummary, useTopApps } from '../hooks/useAnalytics';
import ChildAvatar from '../components/ChildAvatar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

function minutesToHours(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: child, isLoading } = useChild(id!);
  const { data: screenTime } = useScreenTimeSummary(id!, 'week');
  const { data: topApps } = useTopApps(id!, 7);

  if (isLoading) return <div className="text-center py-16 text-gray-400">Loading…</div>;
  if (!child) return <div className="text-center py-16 text-gray-400">Child not found</div>;

  const chartData = screenTime?.records?.map((r: { date: string; totalMinutes: number }) => ({
    date: format(new Date(r.date), 'EEE'),
    minutes: r.totalMinutes,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/children" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <ChildAvatar name={child.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
          <p className="text-gray-500">{child.age} years old • {child.devices.length} device(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Daily limit</p>
          <p className="text-xl font-bold text-gray-900">{minutesToHours(child.dailyScreenLimit)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Avg this week</p>
          <p className="text-xl font-bold text-gray-900">{minutesToHours(screenTime?.avgMinutes ?? 0)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Bedtime</p>
          <p className="text-xl font-bold text-gray-900">
            {child.bedtimeStart ? `${child.bedtimeStart} – ${child.bedtimeEnd}` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Screen time this week</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <Tooltip formatter={(v: number) => [minutesToHours(v), 'Screen time']} />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400">No data yet</p>}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top apps</h2>
          {topApps && topApps.length > 0 ? (
            <div className="space-y-3">
              {topApps.slice(0, 5).map((app: { appName: string; totalMinutes: number; packageName: string }, i: number) => (
                <div key={app.packageName} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-900">{app.appName}</span>
                      <span className="text-gray-500">{minutesToHours(app.totalMinutes)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (app.totalMinutes / (topApps[0].totalMinutes || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No app data yet</p>}
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Paired Devices</h2>
        {child.devices.length > 0 ? (
          <div className="space-y-2">
            {child.devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{device.deviceName}</p>
                  {device.lastSeen && (
                    <p className="text-xs text-gray-500">Last seen {format(new Date(device.lastSeen), 'MMM d, HH:mm')}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${device.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {device.isLocked ? 'Locked' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">No devices paired</p>}
      </div>
    </div>
  );
}
