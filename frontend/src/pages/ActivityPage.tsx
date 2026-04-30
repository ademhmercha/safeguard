import { useState } from 'react';
import { Smartphone, Globe, Search, AlertTriangle, Clock } from 'lucide-react';
import { useChildren } from '../hooks/useChildren';
import { useTimeline } from '../hooks/useActivity';
import { format } from 'date-fns';

const EVENT_META = {
  APP_SESSION: { icon: Smartphone, color: 'bg-blue-50 text-blue-600', label: 'App opened' },
  WEB_VISIT:   { icon: Globe,       color: 'bg-green-50 text-green-600', label: 'Website visited' },
  SEARCH:      { icon: Search,      color: 'bg-purple-50 text-purple-600', label: 'Search' },
  ALERT:       { icon: AlertTriangle, color: 'bg-red-50 text-red-600', label: 'Alert' },
};

function formatDuration(secs?: number) {
  if (!secs) return null;
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function EventRow({ event }: { event: { type: string; timestamp: string; data: Record<string, unknown> } }) {
  const meta = EVENT_META[event.type as keyof typeof EVENT_META] ?? EVENT_META.ALERT;
  const Icon = meta.icon;

  let title = '';
  let subtitle = '';

  if (event.type === 'APP_SESSION') {
    title = event.data.appName as string;
    subtitle = formatDuration(event.data.durationSecs as number) ?? 'Session opened';
  } else if (event.type === 'WEB_VISIT') {
    title = (event.data.title as string) || (event.data.domain as string);
    subtitle = event.data.url as string;
  } else if (event.type === 'SEARCH') {
    title = `"${event.data.searchTerm}"`;
    subtitle = `on ${event.data.sourceApp}`;
  } else if (event.type === 'ALERT') {
    title = event.data.message as string;
    subtitle = event.data.alertType as string;
  }

  const isBlocked = event.data.isBlocked === true;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${isBlocked ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100'}`}>
      <div className={`p-2 rounded-lg flex-shrink-0 ${isBlocked ? 'bg-red-100 text-red-600' : meta.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {format(new Date(event.timestamp), 'HH:mm:ss')}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
        {isBlocked && (
          <span className="text-xs font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded mt-1 inline-block">Blocked</span>
        )}
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const { data: children } = useChildren();
  const [childId, setChildId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const activeChildId = childId || children?.[0]?.id || '';
  const { data: timeline, isLoading } = useTimeline(activeChildId, date);

  const counts = {
    APP_SESSION: timeline?.filter((e: { type: string }) => e.type === 'APP_SESSION').length ?? 0,
    WEB_VISIT:   timeline?.filter((e: { type: string }) => e.type === 'WEB_VISIT').length ?? 0,
    SEARCH:      timeline?.filter((e: { type: string }) => e.type === 'SEARCH').length ?? 0,
    ALERT:       timeline?.filter((e: { type: string }) => e.type === 'ALERT').length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Timeline</h1>
          <p className="text-gray-500 mt-1">Everything your child did — apps, sites, searches</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select className="input w-auto" value={activeChildId} onChange={(e) => setChildId(e.target.value)}>
            {children?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'App opens', count: counts.APP_SESSION, icon: Smartphone, color: 'text-blue-600 bg-blue-50' },
          { label: 'Sites visited', count: counts.WEB_VISIT, icon: Globe, color: 'text-green-600 bg-green-50' },
          { label: 'Searches', count: counts.SEARCH, icon: Search, color: 'text-purple-600 bg-purple-50' },
          { label: 'Alerts', count: counts.ALERT, icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3 py-4">
            <div className={`p-2.5 rounded-xl ${color}`}><Icon className="w-4 h-4" /></div>
            <div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">
            {format(new Date(date), 'EEEE, MMMM d')}
          </h2>
          <span className="ml-auto text-sm text-gray-400">{timeline?.length ?? 0} events</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : timeline && timeline.length > 0 ? (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {timeline.map((event: { type: string; timestamp: string; data: Record<string, unknown> }, i: number) => (
              <EventRow key={i} event={event} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">No activity recorded for this day</div>
        )}
      </div>
    </div>
  );
}
