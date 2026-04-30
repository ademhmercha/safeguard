import { useState } from 'react';
import { Globe, Search, Shield, ExternalLink } from 'lucide-react';
import { useChildren } from '../hooks/useChildren';
import { useBrowserHistory, useTopDomains, useSearchTerms } from '../hooks/useActivity';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function BrowserHistoryPage() {
  const { data: children } = useChildren();
  const [childId, setChildId] = useState('');
  const [tab, setTab] = useState<'history' | 'domains' | 'searches'>('history');
  const [searchFilter, setSearchFilter] = useState('');
  const [days, setDays] = useState(7);

  const activeChildId = childId || children?.[0]?.id || '';
  const { data: history, isLoading: loadingHistory } = useBrowserHistory(activeChildId, undefined, searchFilter || undefined);
  const { data: topDomains, isLoading: loadingDomains } = useTopDomains(activeChildId, days);
  const { data: searches, isLoading: loadingSearches } = useSearchTerms(activeChildId, days);

  const blockedCount = history?.filter((h: { isBlocked: boolean }) => h.isBlocked).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browser History</h1>
          <p className="text-gray-500 mt-1">Websites visited, top domains, and search terms</p>
        </div>
        <select className="input w-auto" value={activeChildId} onChange={(e) => setChildId(e.target.value)}>
          {children?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['history', 'domains', 'searches'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'history' ? 'All visits' : t === 'domains' ? 'Top sites' : 'Searches'}
          </button>
        ))}
      </div>

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Filter by domain…"
                value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} />
            </div>
            {blockedCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">
                <Shield className="w-4 h-4" />
                {blockedCount} blocked attempt{blockedCount > 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="card overflow-hidden p-0">
            {loadingHistory ? (
              <div className="py-12 text-center text-gray-400">Loading…</div>
            ) : history && history.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {history.map((visit: {
                  id: string; url: string; title?: string; domain: string;
                  visitedAt: string; browserApp?: string; isBlocked: boolean;
                }) => (
                  <div key={visit.id} className={`flex items-start gap-3 px-5 py-3 ${visit.isBlocked ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${visit.isBlocked ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <Globe className={`w-3.5 h-3.5 ${visit.isBlocked ? 'text-red-500' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {visit.title || visit.domain}
                        </p>
                        {visit.isBlocked && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">Blocked</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{visit.url}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400">{format(new Date(visit.visitedAt), 'MMM d, HH:mm')}</span>
                        {visit.browserApp && <span className="text-xs text-gray-400">via {visit.browserApp}</span>}
                      </div>
                    </div>
                    <a href={visit.url} target="_blank" rel="noopener noreferrer"
                      className="text-gray-300 hover:text-primary-500 flex-shrink-0 mt-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400">No browser history found</div>
            )}
          </div>
        </div>
      )}

      {tab === 'domains' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <select className="input w-auto" value={days} onChange={(e) => setDays(+e.target.value)}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Most visited sites</h2>
            {loadingDomains ? (
              <div className="py-8 text-center text-gray-400">Loading…</div>
            ) : topDomains && topDomains.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topDomains.slice(0, 10)} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="domain" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip formatter={(v: number) => [`${v} visits`, 'Visits']} />
                    <Bar dataKey="visits" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {topDomains.map((d: { domain: string; visits: number }, i: number) => (
                    <div key={d.domain} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-gray-400 font-mono text-xs">{i + 1}.</span>
                      <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="flex-1 font-medium text-gray-900 truncate">{d.domain}</span>
                      <span className="text-gray-500">{d.visits} visit{d.visits !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-400">No domain data yet</div>
            )}
          </div>
        </div>
      )}

      {tab === 'searches' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <select className="input w-auto" value={days} onChange={(e) => setDays(+e.target.value)}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <div className="card overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Search terms typed</h2>
              <p className="text-xs text-gray-500 mt-0.5">Google, YouTube, browser URL bar</p>
            </div>
            {loadingSearches ? (
              <div className="py-12 text-center text-gray-400">Loading…</div>
            ) : searches && searches.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {searches.map((s: { id: string; searchTerm: string; sourceApp: string; searchedAt: string }) => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <div className="bg-purple-50 p-1.5 rounded-lg flex-shrink-0">
                      <Search className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">"{s.searchTerm}"</p>
                      <p className="text-xs text-gray-400">{s.sourceApp}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(s.searchedAt), 'MMM d, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400">No search terms recorded</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
