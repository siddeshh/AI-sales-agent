import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, CheckCircle2 } from 'lucide-react';
import { AgentInfo, AgentActivity } from '../types';
import { api } from '../services/api';

export const AgentsWorkforceView: React.FC = () => {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statusRes, actList] = await Promise.all([
        api.getAgentsStatus(),
        api.getAgentActivities(30),
      ]);
      setAgents(statusRes.agents);
      setActivities(actList);
      if (statusRes.agents.length > 0 && !selectedAgent) {
        setSelectedAgent(statusRes.agents[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>AI Agents</h2>
          <p>The 10 agents. Runs and durations come from the activity log, which is written by the backend each time an agent actually runs (duration measured, in ms).</p>
        </div>

        <button onClick={loadData} disabled={isLoading} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Grid: Left Agents Table, Right Agent Details & Audit Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left: Clean Operations Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
            Workforce Agents ({agents.length})
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Role</th>
                <th>Status</th>
                <th>Runs logged</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const isSelected = selectedAgent?.id === agent.id;
                return (
                  <tr
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? '#f8fafc' : undefined,
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{agent.name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{agent.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${agent.invocations_count ? 'badge-green' : 'badge-gray'}`}>
                        {agent.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        {agent.invocations_count}
                      </span>
                      {agent.avg_duration_ms != null && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}> · avg {agent.avg_duration_ms} ms</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: Agent Details & Live Activity Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedAgent && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  {selectedAgent.name}
                </div>
                <span className={`badge ${selectedAgent.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{selectedAgent.status}</span>
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                Role: <strong style={{ color: '#0f172a' }}>{selectedAgent.role}</strong>
              </div>

              <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#475569', marginBottom: '12px' }}>
                {selectedAgent.description}
              </p>

              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div>Logged actions: <strong style={{ color: '#0f172a' }}>{selectedAgent.invocations_count}</strong></div>
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
              Activity log (real runs, measured duration)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
              {activities.slice(0, 8).map((act) => (
                <div
                  key={act.id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '4px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{act.agent_name}</span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                      {act.duration_ms != null ? `${act.duration_ms} ms · ` : ''}
                      {new Date(act.created_at + (act.created_at.endsWith('Z') ? '' : 'Z')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: act.status === 'error' ? '#b91c1c' : '#475569' }}>{act.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
