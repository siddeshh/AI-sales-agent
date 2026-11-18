import React, { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { IndustryOption } from '../types';

interface SettingsViewProps {
  industries: IndustryOption[];
  activeIndustry: string;
  onSelectIndustry: (id: string) => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  industries,
  activeIndustry,
  onSelectIndustry,
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
        <p>Configure industry playbooks, reasoning foundation, and test environment state.</p>
      </div>

      {/* Industry Playbook Card */}
      <div className="card">
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
          Industry Playbook
        </div>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
          The multi-agent workforce dynamically reconfigures qualification criteria and objection scripts based on the selected industry:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {industries.map((ind) => {
            const isSelected = activeIndustry === ind.id;
            return (
              <div
                key={ind.id}
                onClick={() => onSelectIndustry(ind.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  border: `1px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    {ind.name}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                      Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                  {ind.description}
                </div>
              </div>
            );
          })}
        </div>
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
              <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
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
          Reset the SQLite database and restore the default demo dataset (Rahul Sharma, Priya Mehta, Amit Patil).
        </p>

        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="btn btn-secondary btn-sm"
        >
          <RotateCcw size={13} className={isResetting ? 'spin' : ''} />
          <span>{isResetting ? 'Resetting...' : 'Restore Default Demo Data'}</span>
        </button>
      </div>
    </div>
  );
};
