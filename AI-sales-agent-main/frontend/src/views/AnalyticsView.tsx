import React from 'react';
import { DashboardMetrics } from '../types';
import { ScoringModelPanel } from '../components/ScoringModelPanel';
import { KpiCard } from '../components/KpiCard';

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
        <p>Meeting rate, win rate, pipeline by stage and objections, computed from the database.</p>
      </div>

      {/* Metric cards: computed by the Analytics agent from the database; hover ⓘ for the formula */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <KpiCard label="Meeting Rate" value={`${kpis.meeting_rate}%`}
          sub={`${kpis.leads_with_meeting} of ${kpis.total_leads} leads`} formula={metrics.formulas?.meeting_rate} />
        <KpiCard label="Win Rate" value={`${kpis.win_rate}%`}
          sub={`${kpis.won_leads} of ${kpis.total_leads} leads`} formula={metrics.formulas?.win_rate} />
        <KpiCard label="Open Pipeline" value={formatCurrency(kpis.pipeline_value_inr)}
          sub="Stated budgets, excl. Won and Lost" formula={metrics.formulas?.pipeline_value_inr} />
        <KpiCard label="Conversations" value={kpis.ai_conversations_count}
          sub="Chat threads (WhatsApp/email channels are simulated)" formula="Count of conversation threads in the database" />
      </div>

      {/* Funnel & Score Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Funnel Breakdown */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
            Pipeline by Stage
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Leads in each stage (adds up to total leads)
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
