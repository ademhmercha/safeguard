interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  trend?: { value: number; label: string };
}

const accent: Record<string, string> = {
  blue:   '#3b82f6',
  green:  '#10b981',
  yellow: '#f59e0b',
  red:    '#ef4444',
};

export default function StatCard({ title, value, subtitle, icon, color = 'blue' }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4"
          style={{ background: `${accent[color]}15`, color: accent[color] }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-300 mt-0.5">{subtitle}</p>}
    </div>
  );
}
