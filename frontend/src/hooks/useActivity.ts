import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useTimeline(childId: string, date?: string) {
  return useQuery({
    queryKey: ['activity', 'timeline', childId, date],
    queryFn: () => api.get(`/activity/timeline/${childId}${date ? `?date=${date}` : ''}`).then((r) => r.data),
    enabled: !!childId,
  });
}

export function useBrowserHistory(childId: string, date?: string, domain?: string) {
  return useQuery({
    queryKey: ['activity', 'browser', childId, date, domain],
    queryFn: () => {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (domain) params.set('domain', domain);
      return api.get(`/activity/browser-history/${childId}?${params}`).then((r) => r.data);
    },
    enabled: !!childId,
  });
}

export function useTopDomains(childId: string, days = 7) {
  return useQuery({
    queryKey: ['activity', 'top-domains', childId, days],
    queryFn: () => api.get(`/activity/top-domains/${childId}?days=${days}`).then((r) => r.data),
    enabled: !!childId,
  });
}

export function useAppSessions(childId: string, date?: string) {
  return useQuery({
    queryKey: ['activity', 'sessions', childId, date],
    queryFn: () => api.get(`/activity/app-sessions/${childId}${date ? `?date=${date}` : ''}`).then((r) => r.data),
    enabled: !!childId,
  });
}

export function useSearchTerms(childId: string, days = 7) {
  return useQuery({
    queryKey: ['activity', 'searches', childId, days],
    queryFn: () => api.get(`/activity/search-terms/${childId}?days=${days}`).then((r) => r.data),
    enabled: !!childId,
  });
}
