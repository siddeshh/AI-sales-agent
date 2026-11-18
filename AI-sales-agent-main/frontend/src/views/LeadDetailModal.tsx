import React, { useState } from 'react';
import { 
  X, Check, Copy, MessageSquare, PhoneCall, 
  Calendar, Mail, CheckCircle2, Clock, ArrowRight, RefreshCw 
} from 'lucide-react';
import { Lead } from '../types';
import { ScoreBadge, StageBadge } from '../components/Badges';
import { api } from '../services/api';

interface LeadDetailModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => void;
  onOpenChat: (lead: Lead) => void;
  onOpenVoice: (lead: Lead) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onOpenChat,
  onOpenVoice,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'score' | 'outreach'>('overview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedOutreach, setGeneratedOutreach] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !lead) return null;

  const handleRunAgent = async (agentType: 'research' | 'score' | 'qualify') => {
    setIsProcessing(true);
    try {
      if (agentType === 'research') await api.researchLead(lead.id);
      else if (agentType === 'score') await api.scoreLead(lead.id);
      else if (agentType === 'qualify') await api.qualifyLead(lead.id);

      const refreshed = await api.getLeadById(lead.id);
      onLeadUpdated(refreshed);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateOutreach = async (channel: 'whatsapp' | 'email') => {
    setIsProcessing(true);
    try {
      const res = await api.getOutreach(lead.id, channel);
      setGeneratedOutreach(res);
      setActiveTab('outreach');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '960px', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                  {lead.name}
                </h3>
                <ScoreBadge score={lead.lead_score} category={lead.score_category} />
                <StageBadge stage={lead.stage} />
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {lead.job_title || 'Lead'} • {lead.company || 'Enterprise'} • {lead.location || 'Pune'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                onClose();
                onOpenChat(lead);
              }}
              className="btn btn-secondary btn-sm"
            >
              <MessageSquare size={13} />
              <span>Chat</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenVoice(lead);
              }}
              className="btn btn-secondary btn-sm"
            >
              <PhoneCall size={13} />
              <span>Voice</span>
            </button>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', height: '620px', background: '#f8fafc' }}>
          {/* Column 1: Lead Information & BANT */}
          <div style={{
            padding: '20px',
            borderRight: '1px solid #e2e8f0',
            overflowY: 'auto',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Contact Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Email: </span>
                  <span style={{ color: '#0f172a' }}>{lead.email || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Phone: </span>
                  <span style={{ color: '#0f172a' }}>{lead.phone || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Location: </span>
                  <span style={{ color: '#0f172a' }}>{lead.location || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Source: </span>
                  <span style={{ color: '#0f172a' }}>{lead.source}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Lead Requirements
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Budget: </span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{lead.budget || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Timeline: </span>
                  <span style={{ color: '#0f172a' }}>{lead.timeline || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Preference: </span>
                  <span style={{ color: '#0f172a' }}>{lead.requirements || '—'}</span>
                </div>
              </div>
            </div>

            {/* BANT Qualification */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                  BANT Qualification
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a' }}>
                  {lead.qualification_status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#475569' }}>Budget</span>
                  <span style={{ fontWeight: 600, color: lead.budget_qualified ? '#16a34a' : '#d97706' }}>
                    {lead.budget_qualified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#475569' }}>Authority</span>
                  <span style={{ fontWeight: 600, color: lead.authority_qualified ? '#16a34a' : '#d97706' }}>
                    {lead.authority_qualified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#475569' }}>Need</span>
                  <span style={{ fontWeight: 600, color: lead.need_qualified ? '#16a34a' : '#d97706' }}>
                    {lead.need_qualified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '4px' }}>
                  <span style={{ color: '#475569' }}>Timeline</span>
                  <span style={{ fontWeight: 600, color: lead.timeline_qualified ? '#16a34a' : '#d97706' }}>
                    {lead.timeline_qualified ? '✓ Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Activity / Research / Outreach Tabs */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              padding: '0 16px',
            }}>
              <button
                onClick={() => setActiveTab('overview')}
                className="btn btn-ghost btn-sm"
                style={{
                  height: '42px',
                  borderRadius: 0,
                  borderBottom: activeTab === 'overview' ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === 'overview' ? '#0f172a' : '#64748b',
                  fontWeight: activeTab === 'overview' ? 600 : 500,
                }}
              >
                Lead Profile &amp; Research
              </button>
              <button
                onClick={() => setActiveTab('score')}
                className="btn btn-ghost btn-sm"
                style={{
                  height: '42px',
                  borderRadius: 0,
                  borderBottom: activeTab === 'score' ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === 'score' ? '#0f172a' : '#64748b',
                  fontWeight: activeTab === 'score' ? 600 : 500,
                }}
              >
                Score Breakdown
              </button>
              <button
                onClick={() => setActiveTab('outreach')}
                className="btn btn-ghost btn-sm"
                style={{
                  height: '42px',
                  borderRadius: 0,
                  borderBottom: activeTab === 'outreach' ? '2px solid #2563eb' : '2px solid transparent',
                  color: activeTab === 'outreach' ? '#0f172a' : '#64748b',
                  fontWeight: activeTab === 'outreach' ? 600 : 500,
                }}
              >
                Outreach Drafts
              </button>
            </div>

            {/* Tab 1: Overview & Research */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                      Research Summary
                    </div>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569' }}>
                      {lead.research_summary || 'Analysis indicates high-intent corporate buyer seeking proximity to Pune tech hub.'}
                    </p>
                  </div>

                  {lead.pain_points && (
                    <div style={{
                      padding: '12px 14px',
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: '6px',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '2px' }}>
                        Identified Pain Points
                      </div>
                      <div style={{ fontSize: '12px', color: '#b45309' }}>
                        {lead.pain_points}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={() => handleGenerateOutreach('whatsapp')}
                      disabled={isProcessing}
                      className="btn btn-secondary btn-sm"
                    >
                      <MessageSquare size={13} />
                      <span>Draft WhatsApp message</span>
                    </button>
                    <button
                      onClick={() => handleGenerateOutreach('email')}
                      disabled={isProcessing}
                      className="btn btn-secondary btn-sm"
                    >
                      <Mail size={13} />
                      <span>Draft Email</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Score Breakdown */}
              {activeTab === 'score' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        Lead Score: {lead.lead_score}/100
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Conversion probability: {Math.round(lead.conversion_probability * 100)}%
                      </div>
                    </div>

                    <button
                      onClick={() => handleRunAgent('score')}
                      disabled={isProcessing}
                      className="btn btn-secondary btn-sm"
                    >
                      <RefreshCw size={12} className={isProcessing ? 'spin' : ''} />
                      <span>Recalculate</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(lead.score_factors || [
                      { id: 1, factor_name: 'High Budget Match', score_impact: 25, explanation: 'Budget of ₹80L matches prime 2 BHK inventory', category: 'Budget' },
                      { id: 2, factor_name: 'Urgent Timeline', score_impact: 20, explanation: '30-day purchasing timeline signifies imminent buying readiness', category: 'Timeline' },
                      { id: 3, factor_name: 'Specific Requirements', score_impact: 15, explanation: 'Explicit floor plan preferences (2 BHK East-facing)', category: 'Need' },
                      { id: 4, factor_name: 'Two-Way Engagement', score_impact: 15, explanation: 'Responded positively to outbound introduction', category: 'Engagement' },
                      { id: 5, factor_name: 'High-Intent Inbound Source', score_impact: 12, explanation: 'Inbound direct website form inquiry with verified phone', category: 'Fit' },
                    ]).map((factor) => (
                      <div
                        key={factor.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            {factor.factor_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {factor.explanation}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: factor.score_impact >= 0 ? '#16a34a' : '#dc2626',
                        }}>
                          {factor.score_impact >= 0 ? `+${factor.score_impact}` : factor.score_impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Outreach Drafts */}
              {activeTab === 'outreach' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                      Generated Outreach Message
                    </div>
                    {generatedOutreach?.content && (
                      <button
                        onClick={() => copyToClipboard(generatedOutreach.content)}
                        className="btn btn-secondary btn-sm"
                      >
                        {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy text'}</span>
                      </button>
                    )}
                  </div>

                  <div style={{
                    padding: '14px',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: '#0f172a',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {generatedOutreach?.content || 'Click "Draft WhatsApp message" or "Draft Email" to synthesize personalized outreach.'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: AI Sales Assistant Panel */}
          <div style={{
            padding: '20px',
            background: '#ffffff',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Sales Assistant Recommendation
              </div>

              <div style={{
                padding: '12px',
                borderRadius: '6px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                marginBottom: '10px',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>
                  {lead.next_best_action || 'Schedule Property Demo'}
                </div>
                <div style={{ fontSize: '12px', color: '#15803d', lineHeight: 1.4 }}>
                  {lead.next_best_action_reason || 'Prospect has confirmed budget and timeline; recommended for site tour.'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => {
                    onClose();
                    onOpenChat(lead);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  <MessageSquare size={13} />
                  <span>Send Message</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenVoice(lead);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%' }}
                >
                  <PhoneCall size={13} />
                  <span>Initiate Voice Call</span>
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Re-Run Agent Evaluation
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => handleRunAgent('research')}
                  disabled={isProcessing}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span>Re-run Lead Research</span>
                </button>
                <button
                  onClick={() => handleRunAgent('qualify')}
                  disabled={isProcessing}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'flex-start' }}
                >
                  <span>Re-evaluate BANT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
