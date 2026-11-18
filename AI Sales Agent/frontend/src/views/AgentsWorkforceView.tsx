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
          <p>Multi-agent workforce architecture, task execution metrics, and operational health.</p>
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
                <th>Tasks Completed</th>
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
                      <span className="badge badge-green">
                        ● {agent.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        {agent.invocations_count}
                      </span>
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
                <span className="badge badge-green">Active</span>
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                Role: <strong style={{ color: '#0f172a' }}>{selectedAgent.role}</strong>
              </div>

              <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#475569', marginBottom: '12px' }}>
                {selectedAgent.description}
              </p>

              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <div>Total invocations: <strong style={{ color: '#0f172a' }}>{selectedAgent.invocations_count}</strong></div>
                <div>SLA: <strong style={{ color: '#16a34a' }}>99.9%</strong></div>
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
              Recent Execution Activity
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
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ color: '#475569' }}>{act.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
