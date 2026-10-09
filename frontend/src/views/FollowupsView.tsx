import React, { useState, useEffect } from 'react';
import { Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import { FollowUp } from '../types';
import { api } from '../services/api';

export const FollowupsView: React.FC = () => {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
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
    try {
      await api.executeFollowup(id);
      await loadFollowups();
    } catch (err) {
      console.error(err);
    } finally {
      setExecutingId(null);
    }
  };

  const filtered = followups.filter((f) => {
    if (activeTab === 'pending') return f.status === 'pending';
    if (activeTab === 'completed') return f.status === 'completed';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Follow-ups</h2>
          <p>Automated multi-step cadence touches with automatic pause when a prospect responds.</p>
        </div>

        <button onClick={loadFollowups} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Cadence Summary Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
          Standard Cadence Steps
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>Day 0</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>Brochure &amp; Pricing</div>
          </div>
          <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>Day 2</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>Amenities Walkthrough</div>
          </div>
          <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>Day 5</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>Financing &amp; Subvention</div>
          </div>
          <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb' }}>Day 10</div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>Final Courtesy Check</div>
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
          Due &amp; Pending ({followups.filter((f) => f.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`btn btn-sm ${activeTab === 'completed' ? 'btn-secondary' : 'btn-ghost'}`}
          style={{ fontWeight: activeTab === 'completed' ? 600 : 500 }}
        >
          Completed ({followups.filter((f) => f.status === 'completed').length})
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
                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                  No follow-ups in this queue. You're all caught up.
                </td>
              </tr>
            ) : (
              filtered.map((fu) => (
                <tr key={fu.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{fu.lead_name || 'Lead'}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{fu.title}</div>
                    {fu.message_content && (
                      <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fu.message_content}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {new Date(fu.due_date).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>
                      {fu.channel}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${fu.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                      {fu.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {fu.status === 'pending' ? (
                      <button
                        onClick={() => handleExecute(fu.id)}
                        disabled={executingId === fu.id}
                        className="btn btn-secondary btn-sm"
                        style={{ height: '26px', fontSize: '11px' }}
                      >
                        <Send size={11} />
                        <span>{executingId === fu.id ? 'Sending...' : 'Send now'}</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#16a34a' }}>✓ Dispatched</span>
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
