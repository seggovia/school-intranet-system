import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, trend, tone = 'positive', icon: Icon }: { label: string; value: string | number; trend?: string; tone?: string; icon: LucideIcon }) {
  return (
    <article className="kpi-card">
      <div className={`kpi-icon tone-${tone}`}>
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {trend && <small>{trend}</small>}
    </article>
  );
}
