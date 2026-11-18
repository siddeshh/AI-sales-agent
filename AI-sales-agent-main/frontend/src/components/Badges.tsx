import React from 'react';

interface ScoreBadgeProps {
  score: number;
  category: 'Cold' | 'Warm' | 'Qualified' | 'Hot' | string;
  showScore?: boolean;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, category, showScore = true }) => {
  const cat = (category || 'Warm').toLowerCase();
  let badgeClass = 'badge-amber';
  if (cat === 'hot' || cat === 'qualified') badgeClass = 'badge-green';
  else if (cat === 'cold') badgeClass = 'badge-gray';

  return (
    <span className={`badge ${badgeClass}`}>
      {showScore ? `${score} • ${category}` : category}
    </span>
  );
};

interface StageBadgeProps {
  stage: string;
}

export const StageBadge: React.FC<StageBadgeProps> = ({ stage }) => {
  const s = (stage || 'New').toLowerCase();
  let badgeClass = 'badge-gray';
  
  if (s === 'new') badgeClass = 'badge-gray';
  else if (s === 'contacted') badgeClass = 'badge-blue';
  else if (s === 'engaged') badgeClass = 'badge-blue';
  else if (s === 'qualified') badgeClass = 'badge-green';
  else if (s.includes('meeting')) badgeClass = 'badge-blue';
  else if (s === 'proposal' || s === 'negotiation') badgeClass = 'badge-amber';
  else if (s === 'won') badgeClass = 'badge-green';
  else if (s === 'lost') badgeClass = 'badge-red';

  return <span className={`badge ${badgeClass}`}>{stage}</span>;
};

interface BANTBadgeProps {
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
}

export const BANTBadge: React.FC<BANTBadgeProps> = ({ budget, authority, need, timeline }) => {
  const items = [
    { label: 'B', ok: budget, tip: 'Budget' },
    { label: 'A', ok: authority, tip: 'Authority' },
    { label: 'N', ok: need, tip: 'Need' },
    { label: 'T', ok: timeline, tip: 'Timeline' },
  ];

  return (
    <div style={{ display: 'inline-flex', gap: '3px' }}>
      {items.map((i) => (
        <span
          key={i.label}
          title={`${i.tip}: ${i.ok ? 'Met' : 'Not yet'}`}
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: '3px',
            background: i.ok ? '#f0fdf4' : '#f1f5f9',
            color: i.ok ? '#166534' : '#94a3b8',
            border: `1px solid ${i.ok ? '#bbf7d0' : '#e2e8f0'}`,
          }}
        >
          {i.label}
        </span>
      ))}
    </div>
  );
};
