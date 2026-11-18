import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import { FollowUp } from '../types';
import { api } from '../services/api';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'badge-gray' },
  sent: { label: 'Sent', cls: 'badge-green' },
  not_sent: { label: 'Not sent', cls: 'badge-red' },
  simulated: { label: 'Demo mode — simulated', cls: 'badge-amber' },
};

export const FollowupsView: React.FC = () => {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [actionError, setActionError] = useState('');
  const [executingId, setExecutingId] = useState<number | null>(null);

  const loadFollowups = async () => {
    try {
      const list = await api.getFollowups();
      setFollowups(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFollowups();
  }, []);

  const handleExecute = async (id: number) => {
    setExecutingId(id);
    setActionError('');
    try {
      await api.executeFollowup(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      await loadFollowups();
      setExecutingId(null);
    }
  };

  const filtered = followups.filter((f) => {
    if (activeTab === 'pending') return f.status === 'pending' || f.status === 'not_sent';
    if (activeTab === 'completed') return f.status === 'sent' || f.status === 'simulated';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Follow-ups</h2>
          <p>Day 0 / 2 / 5 / 10 follow-up tasks. A person clicks to send; nothing is sent automatically.</p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span className="badge badge-green">Email — real (SMTP)</span>
            <span className="badge badge-amber">WhatsApp — Demo mode — simulated</span>
          </div>
        </div>

        <button onClick={loadFollowups} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {actionError && <div style={{ fontSize: '13px', color: 'var(--danger)' }}>{actionError}</div>}

      {/* Cadence Summary Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '8px' }}>
          Standard Cadence Steps
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ padding: '8px 10px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>Day 0</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>Catalogue &amp; Price List</div>
          </div>
          <div style={{ padding: '8px 10px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>Day 2</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>Customisation Options</div>
          </div>
          <div style={{ padding: '8px 10px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>Day 5</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>Sample Call / Showroom Offer</div>
          </div>
          <div style={{ padding: '8px 10px', background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>Day 10</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--foreground)' }}>Final Check-in</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setActiveTab('pending')}
          className={`btn btn-sm ${activeTab === 'pending' ? 'btn-secondary' : 'btn-ghost'}`}
          style={{ fontWeight: activeTab === 'pending' ? 600 : 500 }}
        >
          Due &amp; Pending ({followups.filter((f) => f.status === 'pending' || f.status === 'not_sent').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`btn btn-sm ${activeTab === 'completed' ? 'btn-secondary' : 'btn-ghost'}`}
          style={{ fontWeight: activeTab === 'completed' ? 600 : 500 }}
        >
          Done ({followups.filter((f) => f.status === 'sent' || f.status === 'simulated').length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
          style={{ fontWeight: activeTab === 'all' ? 600 : 500 }}
        >
          All ({followups.length})
        </button>
      </div>

      {/* Tasks Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Action / Subject</th>
              <th>Due Date</th>
              <th>Channel</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted-foreground)' }}>
                  No follow-ups in this queue. You're all caught up.
                </td>
              </tr>
            ) : (
              filtered.map((fu) => (
                <tr key={fu.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{fu.lead_name || 'Lead'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>{fu.title}</div>
                    {fu.message_content && (
                      <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fu.message_content}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                      {new Date(fu.due_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                      {fu.channel}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS[fu.status]?.cls || 'badge-gray'}`}>
                      {STATUS[fu.status]?.label || fu.status}
                    </span>
                    {fu.status === 'not_sent' && fu.send_error && (
                      <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '3px', maxWidth: '260px' }}>{fu.send_error}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {fu.status === 'pending' || fu.status === 'not_sent' ? (
                      <button
                        onClick={() => handleExecute(fu.id)}
                        disabled={executingId === fu.id}
                        className="btn btn-secondary btn-sm"
                        style={{ height: '26px', fontSize: '12px' }}
                        title={fu.channel === 'email' ? 'Sends a real email over SMTP' : 'No WhatsApp integration: marks it as simulated, nothing is sent'}
                      >
                        <Send size={11} />
                        <span>
                          {executingId === fu.id ? 'Working...'
                            : fu.channel === 'email' ? (fu.status === 'not_sent' ? 'Retry email' : 'Send email')
                            : 'Simulate (demo)'}
                        </span>
                      </button>
                    ) : fu.status === 'sent' ? (
                      <span style={{ fontSize: '12px', color: 'var(--success)' }}>✓ Accepted by SMTP server</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--warning)' }}>Not sent (simulated)</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
