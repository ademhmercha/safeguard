import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Overview {
  totalChildren: number;
  totalDevices: number;
  todayScreenTimeMinutes: number;
  unreadAlerts: number;
}

export function useOverview() {
  return useQuery<Overview>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useScreenTimeSummary(childId: string, period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: ['analytics', 'screen-time', childId, period],
    queryFn: () => api.get(`/analytics/screen-time-summary/${childId}?period=${period}`).then((r) => r.data),
    enabled: !!childId,
  });
}

export function useTopApps(childId: string, days = 7) {
  return useQuery({
    queryKey: ['analytics', 'top-apps', childId, days],
    queryFn: () => api.get(`/analytics/top-apps/${childId}?days=${days}`).then((r) => r.data),
    enabled: !!childId,
  });
}
