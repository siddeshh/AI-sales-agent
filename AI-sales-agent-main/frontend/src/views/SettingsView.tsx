import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '../services/api';

interface Integration {
  name: string;
  kind: 'real' | 'simulated' | 'fallback';
  badge: string;
  configured: boolean;
  detail: string;
}

interface SettingsViewProps {
  onResetDemo: () => void;
  isResetting: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onResetDemo,
  isResetting,
}) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getIntegrations()
      .then((r) => setIntegrations(r.integrations))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load integrations'));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '780px' }}>
      {/* Header */}
      <div>
        <h2>Settings</h2>
        <p>Integration status and demo data for the Celestial Wear demo.</p>
      </div>

      {/* Integrations: status comes from GET /api/integrations, nothing is configured from the browser */}
      <div className="card">
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
          Integrations
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
          What is really connected. Keys and SMTP settings live in <code>backend/.env</code> (restart the backend after changing them).
        </p>
        {error && <div style={{ fontSize: '12px', color: '#b91c1c' }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {integrations.map((i) => (
            <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start',
              padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{i.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{i.detail}</div>
              </div>
              <span className={`badge ${i.kind === 'real' ? (i.configured ? 'badge-green' : 'badge-red') : 'badge-amber'}`}
                style={{ whiteSpace: 'nowrap' }}>
                {i.kind === 'real' && !i.configured ? `${i.badge} · not configured` : i.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Database State */}
      <div className="card">
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
          Demo Data State
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
          Delete all data and reload the Celestial Wear demo seed: 12 retail leads, 4 knowledge documents, 5 conversations, 3 meetings and follow-ups.
        </p>

        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="btn btn-secondary btn-sm"
        >
          <RotateCcw size={13} className={isResetting ? 'spin' : ''} />
          <span>{isResetting ? 'Resetting...' : 'Reset demo data'}</span>
        </button>
      </div>
    </div>
  );
};
