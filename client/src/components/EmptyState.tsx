import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 12, textAlign: 'center' }}>
      {icon && <div style={{ color: 'var(--text-muted)', marginBottom: 8 }}>{icon}</div>}
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{title}</p>
      {description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, maxWidth: 400 }}>{description}</p>}
      {action && <button className="primary-button" onClick={action.onClick} style={{ marginTop: 8 }}>{action.label}</button>}
    </div>
  );
}
