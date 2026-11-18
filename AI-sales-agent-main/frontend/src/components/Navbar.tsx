import React from 'react';
import { RotateCcw, PlayCircle } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onOpenTour: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenTour,
  onResetDemo,
  isResetting,
}) => {
  const viewTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    leads: 'Leads',
    conversations: 'Conversations',
    voice: 'Voice Agent',
    crm: 'CRM Pipeline',
    knowledge: 'Knowledge Base',
    meetings: 'Meetings',
    followups: 'Follow-ups',
    analytics: 'Analytics',
    agents: 'AI Agents',
    settings: 'Settings',
  };

  return (
    <header style={{
      height: '56px',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      {/* View Title & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Workspace</span>
        <span style={{ fontSize: '13px', color: '#cbd5e1' }}>/</span>
        <h1 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
          {viewTitles[currentView] || 'Sales Workforce'}
        </h1>
      </div>

      {/* Controls & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Demo data label (rule: anything simulated is labelled) */}
        <span className="badge badge-amber" title="Seeded sample data for the fictional brand Celestial Wear">
          Demo mode · Celestial Wear
        </span>

        {/* 20-Step Demo Tour Button */}
        <button
          onClick={onOpenTour}
          className="btn btn-secondary btn-sm"
          title="Guided 20-step sales workflow tour"
        >
          <PlayCircle size={14} color="#2563eb" />
          <span>Workflow Tour</span>
        </button>

        {/* Reset Demo Data Button */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="btn btn-secondary btn-sm"
          title="Delete all data and reload the Celestial Wear demo seed"
        >
          <RotateCcw size={13} color="#64748b" className={isResetting ? 'spin' : ''} />
          <span>{isResetting ? 'Resetting...' : 'Reset demo data'}</span>
        </button>
      </div>
    </header>
  );
};
