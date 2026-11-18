import React, { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';

interface SettingsViewProps {
  onResetDemo: () => void;
  isResetting: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onResetDemo,
  isResetting,
}) => {
  const [provider, setProvider] = useState('mock');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '780px' }}>
      {/* Header */}
      <div>
        <h2>Settings</h2>
        <p>Reasoning engine and demo data for the Celestial Wear demo.</p>
      </div>

      {/* LLM Engine Configuration */}
      <div className="card">
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
          Reasoning Engine
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
          By default, the platform runs on a <strong>Deterministic Local Engine</strong> allowing offline execution without external API keys.
        </p>

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#475569', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
              LLM Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="form-select"
              style={{ height: '34px', fontSize: '13px' }}
            >
              <option value="mock">Deterministic Local Mock Engine (Offline evaluation)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="groq">Groq (Llama-3-70B)</option>
              <option value="ollama">Ollama (localhost:11434)</option>
            </select>
          </div>

          {provider !== 'mock' && (
            <div>
              <label style={{ fontSize: '12px', color: '#475569', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                API Key for {provider.toUpperCase()}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="form-input"
                style={{ height: '34px', fontSize: '13px' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="submit" className="btn btn-primary btn-sm">
              Save Configuration
            </button>
            {saved && (
              <span style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} />
                <span>Saved successfully</span>
              </span>
            )}
          </div>
        </form>
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
