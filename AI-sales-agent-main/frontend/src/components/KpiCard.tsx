import React from 'react';

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  formula?: string; // shown as a tooltip so every number can be traced to how it is computed
}

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, sub, formula }) => (
  <div className="card" style={{ padding: '14px 16px' }} title={formula}>
    <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
      {label}
      {formula && (
        <span aria-label={`Formula: ${formula}`} style={{ cursor: 'help', color: 'var(--muted-foreground)', fontSize: '12px' }}>ⓘ</span>
      )}
    </div>
    <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--foreground)', margin: '4px 0 2px' }}>{value}</div>
    {sub && <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{sub}</div>}
  </div>
);
