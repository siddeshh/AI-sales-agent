import React from 'react';
import { DashboardMetrics } from '../types';
import { ScoringModelPanel } from '../components/ScoringModelPanel';

interface AnalyticsViewProps {
  metrics: DashboardMetrics | null;
  onNavigate: (view: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ metrics }) => {
  if (!metrics) {
    return <div className="card" style={{ fontSize: '13px', color: '#64748b' }}>Loading analytics…</div>;
  }
  const kpis = metrics.kpis;
  const scoreDist = metrics.score_distribution;
  const objections = metrics.objections || [];
  const totalObjections = objections.reduce((n, o) => n + o.count, 0);
  const objectionLabels: Record<string, string> = {
    price: 'Price', moq: 'Minimum order quantity', delivery: 'Delivery time', competitor: 'Competitor comparison',
    authority: 'Needs approval', timing: 'Not now', no_interest: 'Not interested', send_details: 'Asked for details',
  };

  const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

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
          <div style={{ fontSize: '11px', color: '#64748b' }}>Meetings scheduled / total leads</div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active Pipeline</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px' }}>
            {formatCurrency(kpis.pipeline_value_inr)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Stated budgets of open leads</div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Meetings Scheduled</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px' }}>
            {kpis.meetings_scheduled}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Demo calls &amp; showroom visits</div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Conversations Handled</div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#0f172a', margin: '4px 0 2px' }}>
            {kpis.ai_conversations_count}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Chat, WhatsApp &amp; email threads</div>
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
            {metrics.funnel.map((step) => (
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
          Objections recorded by the Objection agent ({totalObjections} total) and how many it answered
        </div>

        {objections.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b' }}>No objections recorded yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
            {objections.map((obj) => (
              <div key={obj.type} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                  {objectionLabels[obj.type] || obj.type}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                  {obj.count} ({obj.percentage}% of objections)
                </div>
                <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 500 }}>
                  {obj.addressed} answered by the agent
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ScoringModelPanel />
    </div>
  );
};
