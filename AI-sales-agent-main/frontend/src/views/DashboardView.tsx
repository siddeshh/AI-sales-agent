import { KpiCard } from '../components/KpiCard';
import React from 'react';
import { 
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, 
  ArrowRight, CheckCircle2, AlertCircle, Clock, Plus 
} from 'lucide-react';
import { DashboardMetrics, Lead, Meeting, FollowUp } from '../types';
import { ScoreBadge, StageBadge } from '../components/Badges';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  leads: Lead[];
  meetings: Meeting[];
  followups: FollowUp[];
  onNavigate: (view: string) => void;
  onOpenLead: (lead: Lead) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  leads,
  meetings,
  followups,
  onNavigate,
  onOpenLead,
}) => {
  // Zeros until the API answers: never show made-up numbers.
  const kpis = metrics?.kpis || {
    total_leads: 0, new_leads: 0, hot_leads: 0, bant_qualified_leads: 0, meetings_scheduled: 0, leads_with_meeting: 0,
    won_leads: 0, meeting_rate: 0, win_rate: 0, pipeline_value_inr: 0, ai_conversations_count: 0, active_followups: 0,
  };
  const formulas = metrics?.formulas || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  const funnelSteps = metrics?.funnel || [];
  const pct = (n: number) => (kpis.total_leads ? Math.round((n / kpis.total_leads) * 100) : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2>{greeting}</h2>
          <p>Sales activity overview and workforce recommendations.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px' }}>
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Celestial Wear
          </span>
          <button onClick={() => onNavigate('leads')} className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* KPI row: every value comes from /api/analytics/dashboard; hover ⓘ for the formula */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        <KpiCard label="Total Leads" value={kpis.total_leads} sub={`${kpis.new_leads} new, ${kpis.hot_leads} hot (score 81+)`}
          formula="Count of all leads in the database" />
        <KpiCard label="BANT Qualified" value={kpis.bant_qualified_leads}
          sub={`${pct(kpis.bant_qualified_leads)}% of leads meet all 4 BANT criteria`} formula={formulas.bant_qualified_leads} />
        <KpiCard label="Meeting Rate" value={`${kpis.meeting_rate}%`}
          sub={`${kpis.leads_with_meeting} of ${kpis.total_leads} leads have a meeting`} formula={formulas.meeting_rate} />
        <KpiCard label="Win Rate" value={`${kpis.win_rate}%`}
          sub={`${kpis.won_leads} of ${kpis.total_leads} leads won`} formula={formulas.win_rate} />
        <KpiCard label="Open Pipeline" value={formatCurrency(kpis.pipeline_value_inr)}
          sub="Stated budgets, excl. Won and Lost" formula={formulas.pipeline_value_inr} />
      </div>

      {/* Clean Sales Funnel Section */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Sales Pipeline Funnel</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Leads in each pipeline stage (adds up to total leads)</div>
          </div>
          <button onClick={() => onNavigate('crm')} className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }}>
            <span>View CRM Pipeline</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Horizontal Pipeline Steps */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${funnelSteps.length}, 1fr)`,
          gap: '8px',
        }}>
          {funnelSteps.map((step, idx) => (
            <div
              key={step.stage}
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                  {step.stage}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a' }}>
                  {step.count}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                background: '#e2e8f0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.max(8, step.percentage)}%`,
                  height: '100%',
                  background: idx >= 3 ? '#16a34a' : '#2563eb',
                  borderRadius: '2px',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Recent Leads Table, Right AI Insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
        {/* Left: Recent Leads Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Recent Prospects</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Active leads requiring follow-up</div>
            </div>
            <button onClick={() => onNavigate('leads')} className="btn btn-secondary btn-sm">
              <span>View all leads</span>
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Source</th>
                <th>Stage</th>
                <th>Score</th>
                <th>Next Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 4).map((ld) => (
                <tr
                  key={ld.id}
                  onClick={() => onOpenLead(ld)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {ld.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{ld.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {ld.budget} • {ld.location}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {ld.source}
                    </span>
                  </td>
                  <td>
                    <StageBadge stage={ld.stage} />
                  </td>
                  <td>
                    <ScoreBadge score={ld.lead_score} category={ld.score_category} />
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500 }}>
                      {ld.next_best_action || 'Send outreach'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right: AI Insights Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Insights Card */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
              Sales Assistant Insights
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              3 high-intent leads need attention today
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(metrics?.insights || []).map((ins) => (
                <div
                  key={ins.id}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '3px' }}>
                    {ins.title}
                  </div>
                  <p style={{ fontSize: '12px', color: '#475569', marginBottom: '8px', lineHeight: 1.4 }}>
                    {ins.description}
                  </p>
                  <button
                    onClick={() => {
                      if (ins.action_type === 'schedule_vip') onNavigate('meetings');
                      else if (ins.action_type === 'activate_playbook') onNavigate('knowledge');
                      else onNavigate('leads');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                  >
                    <span>{ins.action_text}</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Meetings Card */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Upcoming Meetings</span>
              <button onClick={() => onNavigate('meetings')} className="btn btn-ghost btn-sm" style={{ padding: 0, height: 'auto', fontSize: '12px' }}>
                Calendar
              </button>
            </div>

            {meetings.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>No upcoming meetings.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {meetings.slice(0, 2).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {new Date(m.scheduled_time).toLocaleDateString()} • {m.duration_minutes} min
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
