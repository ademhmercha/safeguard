import { useState } from 'react';
import { useChildren } from '../hooks/useChildren';
import { useTopApps } from '../hooks/useAnalytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function minutesToHours(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function AppUsagePage() {
  const { data: children } = useChildren();
  const [childId, setChildId] = useState('');
  const [days, setDays] = useState(7);

  const activeChild = childId || children?.[0]?.id || '';
  const { data: apps, isLoading } = useTopApps(activeChild, days);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Usage</h1>
          <p className="text-gray-500 mt-1">Top apps by usage time</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-auto" value={activeChild} onChange={(e) => setChildId(e.target.value)}>
            {children?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input w-auto" value={days} onChange={(e) => setDays(+e.target.value)}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Top 10 apps</h2>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Loading…</div>
        ) : apps && apps.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={apps} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
                <YAxis type="category" dataKey="appName" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(v: number) => [minutesToHours(v), 'Usage']} />
                <Bar dataKey="totalMinutes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 space-y-2">
              {apps.map((app: { appName: string; totalMinutes: number; packageName: string }, i: number) => (
                <div key={app.packageName} className="flex items-center gap-3">
                  <span className="w-6 text-sm text-gray-400 font-mono">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{app.appName}</span>
                      <span className="text-sm text-gray-500 ml-3 flex-shrink-0">{minutesToHours(app.totalMinutes)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (app.totalMinutes / (apps[0].totalMinutes || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">No app usage data yet</div>
        )}
      </div>
    </div>
  );
}
