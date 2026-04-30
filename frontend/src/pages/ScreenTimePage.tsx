import { useState } from 'react';
import { useChildren } from '../hooks/useChildren';
import { useScreenTimeSummary } from '../hooks/useAnalytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

function minutesToHours(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function ScreenTimePage() {
  const { data: children } = useChildren();
  const [childId, setChildId] = useState('');
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const activeChild = childId || children?.[0]?.id || '';
  const { data: summary, isLoading } = useScreenTimeSummary(activeChild, period);

  const chartData = summary?.records?.map((r: { date: string; totalMinutes: number }) => ({
    date: format(new Date(r.date), period === 'week' ? 'EEE' : 'MMM d'),
    minutes: r.totalMinutes,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screen Time</h1>
          <p className="text-gray-500 mt-1">Daily usage history</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-auto" value={activeChild} onChange={(e) => setChildId(e.target.value)}>
            {children?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {(['week', 'month'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium ${period === p ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {p === 'week' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{isLoading ? '—' : minutesToHours(summary?.totalMinutes ?? 0)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Daily average</p>
          <p className="text-2xl font-bold text-gray-900">{isLoading ? '—' : minutesToHours(summary?.avgMinutes ?? 0)}</p>
        </div>
        <div className="card text-center">
          <p className="text-sm text-gray-500 mb-1">Daily limit</p>
          <p className="text-2xl font-bold text-gray-900">{isLoading ? '—' : minutesToHours(summary?.dailyLimit ?? 0)}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Screen time per day</h2>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Loading…</div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.floor(v / 60)}h`} />
              <Tooltip formatter={(v: number) => [minutesToHours(v), 'Screen time']} />
              <ReferenceLine y={summary?.dailyLimit} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Limit', fill: '#ef4444', fontSize: 11 }} />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400">No data for this period</div>
        )}
      </div>
    </div>
  );
}
