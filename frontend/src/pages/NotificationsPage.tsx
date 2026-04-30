import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkAllRead } from '../hooks/useNotifications';
import { format } from 'date-fns';

const typeColors: Record<string, string> = {
  SCREEN_TIME_LIMIT: 'bg-yellow-100 text-yellow-700',
  APP_BLOCKED: 'bg-red-100 text-red-700',
  DEVICE_LOCKED: 'bg-blue-100 text-blue-700',
  BEDTIME_ALERT: 'bg-purple-100 text-purple-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAll = useMarkAllRead();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Alerts and activity updates</p>
        </div>
        {notifications && notifications.some((n: { isRead: boolean }) => !n.isRead) && (
          <button onClick={() => markAll.mutate()} className="btn-secondary flex items-center gap-2 text-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n: { id: string; isRead: boolean; type: string; title: string; body: string; createdAt: string }) => (
            <div key={n.id} className={`card flex items-start gap-4 ${!n.isRead ? 'border-l-4 border-l-primary-500' : ''}`}>
              <div className={`p-2 rounded-lg flex-shrink-0 ${typeColors[n.type] || typeColors.GENERAL}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{n.title}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(new Date(n.createdAt), 'MMM d, HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-16">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      )}
    </div>
  );
}
