import React from 'react';
import { DashboardMetrics } from '../types';

interface AnalyticsViewProps {
  metrics: DashboardMetrics | null;
  onNavigate: (view: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ metrics }) => {
  const kpis = metrics?.kpis || {
    total_leads: 3,
    new_leads: 0,
    hot_leads: 2,
    qualified_leads: 2,
    meetings_scheduled: 1,
    conversion_rate: 33.3,
    pipeline_value_inr: 25500000,
    ai_conversations_count: 4,
    active_followups: 2,
  };

  const scoreDist = metrics?.score_distribution || {
    'Hot (81-100)': 2,
    'Qualified (61-80)': 0,
    'Warm (31-60)': 1,
    'Cold (0-30)': 0,
  };

  const objections = [
    { type: 'Price / Budget Ceiling', percentage: 68, resolved: '79% resolved with 10:90 subvention financing' },
    { type: 'Timeline & Possession Uncertainty', percentage: 18, resolved: '84% resolved with MahaRERA guarantee' },
    { type: 'Competitor Comparison', percentage: 14, resolved: '72% resolved with open green ratio proof' },
  ];

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2>Analytics</h2>
        <p>Conversion metrics, pipeline velocity, and objection patterns.</p>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Conversion Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px' }}>
            {kpis.conversion_rate}%
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a' }}>+4.2% vs target</div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active Pipeline</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px' }}>
            {formatCurrency(kpis.pipeline_value_inr)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Qualified &amp; Hot deals</div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Avg. Response Time</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px' }}>
            &lt; 3.2s
          </div>
          <div style={{ fontSize: '11px', color: '#16a34a' }}>Autonomous AI pod</div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Conversations Handled</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px' }}>
            {kpis.ai_conversations_count}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Omnichannel chat &amp; voice</div>
        </div>
      </div>

      {/* Funnel & Score Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Funnel Breakdown */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
            Funnel Conversion Velocity
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Milestone progression from inbound acquisition to close
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(metrics?.funnel || [
              { stage: 'New Inbound', count: 3, percentage: 100 },
              { stage: 'AI Research & Score', count: 3, percentage: 100 },
              { stage: 'Contacted', count: 3, percentage: 100 },
              { stage: 'Engaged', count: 2, percentage: 67 },
              { stage: 'BANT Qualified', count: 2, percentage: 67 },
              { stage: 'Meeting Scheduled', count: 1, percentage: 33 },
            ]).map((step) => (
              <div key={step.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#475569' }}>{step.stage}</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{step.count} ({step.percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(6, step.percentage)}%`, height: '100%', background: '#2563eb', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Score Distribution */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
            Lead Score Tiers
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Prospect distribution across readiness categories
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(scoreDist).map(([category, count]) => {
              const maxCount = Math.max(...Object.values(scoreDist), 1);
              const barWidth = Math.max(10, (count / maxCount) * 100);

              return (
                <div key={category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>{category}</span>
                    <span style={{ color: '#64748b' }}>{count} leads</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${barWidth}%`, height: '100%', background: '#0f172a', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Objection Clustering */}
      <div className="card">
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
          Objection Handling Performance
        </div>
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
          Frequency of customer hesitations and playbook resolution rates
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {objections.map((obj, i) => (
            <div key={i} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                {obj.type}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                {obj.percentage}% of inquiries
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>
                ✓ {obj.resolved}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
