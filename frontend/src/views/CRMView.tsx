import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Lead } from '../types';
import { ScoreBadge } from '../components/Badges';
import { api } from '../services/api';

interface CRMViewProps {
  onOpenLead: (lead: Lead) => void;
  onRefreshLeads: () => void;
}

export const CRMView: React.FC<CRMViewProps> = ({ onOpenLead, onRefreshLeads }) => {
  const [pipelineData, setPipelineData] = useState<{
    stages: string[];
    pipeline: Record<string, { leads: Lead[]; count: number; total_value_inr: number }>;
    total_active_pipeline_value: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const loadPipeline = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCRMPipeline();
      setPipelineData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const handleMoveStage = async (leadId: number, newStage: string) => {
    try {
      await api.moveStage(leadId, newStage);
      await loadPipeline();
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (val: number) => `₹${Math.round(val).toLocaleString('en-IN')}`;

  const STAGES_LIST = [
    'New', 'Contacted', 'Engaged', 'Qualified', 'Meeting Scheduled', 
    'Proposal', 'Negotiation', 'Won', 'Lost'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 104px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>CRM Pipeline</h2>
          <p>
            Open pipeline (stated budgets, excl. Won and Lost):{' '}
            <strong style={{ color: 'var(--foreground)' }}>
              {formatCurrency(pipelineData?.total_active_pipeline_value ?? 0)}
            </strong>
          </p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span className="badge badge-green">Internal CRM — real (this app's database)</span>
            <span className="badge badge-amber" title="Not connected: nothing is synced to these systems">
              Salesforce / HubSpot / Zoho — Demo mode — simulated
            </span>
          </div>
        </div>

        <button onClick={loadPipeline} disabled={isLoading} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        display: 'flex',
        gap: '12px',
        paddingBottom: '12px',
      }}>
        {STAGES_LIST.map((stageName, stageIdx) => {
          const colData = pipelineData?.pipeline[stageName] || { leads: [], count: 0, total_value_inr: 0 };

          return (
            <div
              key={stageName}
              style={{
                width: '260px',
                minWidth: '260px',
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '100%',
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--card)',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
                    {stageName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {formatCurrency(colData.total_value_inr)}
                  </div>
                </div>

                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'var(--muted)',
                  color: 'var(--muted-foreground)',
                }}>
                  {colData.count}
                </span>
              </div>

              {/* Cards List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {colData.leads.length === 0 ? (
                  <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: '13px', color: 'var(--muted-foreground)' }}>
                    No leads
                  </div>
                ) : (
                  colData.leads.map((ld) => (
                    <div
                      key={ld.id}
                      onClick={() => onOpenLead(ld)}
                      style={{
                        padding: '12px',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
                          {ld.name}
                        </span>
                        <ScoreBadge score={ld.lead_score} category={ld.score_category} />
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '2px' }}>
                        {ld.budget} • {ld.requirements}
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '8px' }}>
                        {ld.location} • {ld.timeline}
                      </div>

                      {/* Advance Stage Controls */}
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--muted)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          disabled={stageIdx === 0}
                          onClick={() => handleMoveStage(ld.id, STAGES_LIST[stageIdx - 1])}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 4px', height: '22px' }}
                          title="Move Back"
                        >
                          <ChevronLeft size={13} />
                        </button>

                        <button
                          disabled={stageIdx === STAGES_LIST.length - 2}
                          onClick={() => handleMoveStage(ld.id, STAGES_LIST[stageIdx + 1])}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 8px', height: '22px', fontSize: '12px' }}
                        >
                          <span>Move next</span>
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
