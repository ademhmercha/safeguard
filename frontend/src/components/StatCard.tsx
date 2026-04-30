interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  trend?: { value: number; label: string };
}

const config = {
  blue: {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '#bfdbfe',
    icon: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    value: '#1e40af',
    badge: '#dbeafe',
    badgeText: '#1d4ed8',
  },
  green: {
    bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    border: '#bbf7d0',
    icon: 'linear-gradient(135deg, #22c55e, #15803d)',
    value: '#166534',
    badge: '#dcfce7',
    badgeText: '#15803d',
  },
  yellow: {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    border: '#fde68a',
    icon: 'linear-gradient(135deg, #f59e0b, #d97706)',
    value: '#92400e',
    badge: '#fef3c7',
    badgeText: '#d97706',
  },
  red: {
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    border: '#fecaca',
    icon: 'linear-gradient(135deg, #ef4444, #dc2626)',
    value: '#991b1b',
    badge: '#fee2e2',
    badgeText: '#dc2626',
  },
};

export default function StatCard({ title, value, subtitle, icon, color = 'blue', trend }: StatCardProps) {
  const c = config[color];
  return (
    <div
      className="rounded-2xl p-5 border transition-all duration-200 hover:translate-y-[-1px]"
      style={{ background: c.bg, borderColor: c.border, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: c.icon }}
        >
          <div className="text-white [&>svg]:w-5 [&>svg]:h-5">{icon}</div>
        </div>
        {trend && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full"
            style={{ background: c.badge, color: c.badgeText }}
          >
            {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold tracking-tight" style={{ color: c.value }}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
