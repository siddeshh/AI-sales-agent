import React, { useEffect, useState } from 'react';
import { api as timelineApi } from '../services/api';
import { timeAgo } from '@/lib/format';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'score' | 'timeline' | 'outreach'>('overview');
  const [timeline, setTimeline] = useState<any[] | null>(null);

  useEffect(() => {
    if (activeTab !== 'timeline' || !lead) return;
    setTimeline(null);
    timelineApi.getLeadTimeline(lead.id).then(setTimeline).catch(() => setTimeline([]));
  }, [activeTab, lead?.id, lead?.lead_score]); // eslint-disable-line react-hooks/exhaustive-deps
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedOutreach, setGeneratedOutreach] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !lead) return null;

  const bant: Record<string, { status: string; evidence: string }> | null = (() => {
    try {
      return lead.bant_json ? JSON.parse(lead.bant_json) : null;
    } catch {
      return null;
    }
  })();

  const breakdown = (() => {
    try {
      return lead.score_breakdown_json ? JSON.parse(lead.score_breakdown_json) : null;
    } catch {
      return null;
    }
  })();

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
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--foreground)' }}>
                  {lead.name}
                </h3>
                <ScoreBadge score={lead.lead_score} category={lead.score_category} />
                <StageBadge stage={lead.stage} />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '2px' }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 280px', height: '620px', background: 'var(--muted)' }}>
          {/* Column 1: Lead Information & BANT */}
          <div style={{
            padding: '20px',
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            background: 'var(--card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Contact Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>Email: </span>
                  <span style={{ color: 'var(--foreground)' }}>{lead.email || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>Phone: </span>
                  <span style={{ color: 'var(--foreground)' }}>{lead.phone || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>Location: </span>
                  <span style={{ color: 'var(--foreground)' }}>{lead.location || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>Source: </span>
                  <span style={{ color: 'var(--foreground)' }}>{lead.source}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Lead Requirements
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>Budget: </span>
                  <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{lead.budget || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>Timeline: </span>
                  <span style={{ color: 'var(--foreground)' }}>{lead.timeline || '—'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted-foreground)' }}>Preference: </span>
                  <span style={{ color: 'var(--foreground)' }}>{lead.requirements || '—'}</span>
                </div>
              </div>
            </div>

            {/* BANT Qualification */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>
                  BANT Qualification
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
                  {lead.qualification_status}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {(['budget', 'authority', 'need', 'timeline'] as const).map((key) => {
                  const slot = bant?.[key];
                  const met = (lead as any)[`${key}_qualified`];
                  const status = slot?.status || (met ? 'met on lead form' : 'not yet');
                  const cls = status === 'confirmed' || status === 'met on lead form' ? 'badge-green' : status === 'partial' ? 'badge-amber' : 'badge-gray';
                  return (
                    <div key={key} className="rounded-md bg-muted px-2.5 py-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="capitalize text-muted-foreground">{key}</span>
                        <span className={`badge ${cls}`}>{status}</span>
                      </div>
                      {slot?.evidence && <div className="mt-0.5 text-xs italic text-muted-foreground">"{slot.evidence}"</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Column 2: Activity / Research / Outreach Tabs */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: 'var(--card)',
            borderRight: '1px solid var(--border)',
          }}>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              padding: '0 16px',
            }}>
              <button
                onClick={() => setActiveTab('overview')}
                className="btn btn-ghost btn-sm"
                style={{
                  height: '42px',
                  borderRadius: 0,
                  borderBottom: activeTab === 'overview' ? '2px solid var(--brand)' : '2px solid transparent',
                  color: activeTab === 'overview' ? 'var(--foreground)' : 'var(--muted-foreground)',
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
                  borderBottom: activeTab === 'score' ? '2px solid var(--brand)' : '2px solid transparent',
                  color: activeTab === 'score' ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontWeight: activeTab === 'score' ? 600 : 500,
                }}
              >
                Score Breakdown
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className="btn btn-ghost btn-sm"
                style={{
                  height: '42px',
                  borderRadius: 0,
                  borderBottom: activeTab === 'timeline' ? '2px solid var(--brand)' : '2px solid transparent',
                  color: activeTab === 'timeline' ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontWeight: activeTab === 'timeline' ? 600 : 500,
                }}
              >
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('outreach')}
                className="btn btn-ghost btn-sm"
                style={{
                  height: '42px',
                  borderRadius: 0,
                  borderBottom: activeTab === 'outreach' ? '2px solid var(--brand)' : '2px solid transparent',
                  color: activeTab === 'outreach' ? 'var(--foreground)' : 'var(--muted-foreground)',
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
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '4px' }}>
                      Research Summary
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
                      {lead.research_summary || 'Analysis indicates high-intent corporate buyer seeking proximity to Pune tech hub.'}
                    </p>
                  </div>

                  {lead.pain_points && (
                    <div style={{
                      padding: '12px 14px',
                      background: 'var(--warning-soft)',
                      border: '1px solid var(--warning-border)',
                      borderRadius: '6px',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning)', marginBottom: '2px' }}>
                        Identified Pain Points
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--warning)' }}>
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
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
                        Lead Score: {lead.lead_score}/100
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                        Tier: {lead.score_category} (Cold 0-30, Warm 31-60, Qualified 61-80, Hot 81-100)
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

                  {breakdown && (
                    <div style={{ padding: '12px 14px', borderRadius: '6px', background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', fontSize: '13px', color: 'var(--brand)', lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>How this score is calculated</div>
                      <div style={{ fontFamily: 'monospace' }}>final = round(0.7 × base) + BANT bonus</div>
                      <div style={{ fontFamily: 'monospace' }}>
                        base = {breakdown.profile_points} profile points / {breakdown.profile_max} × 100 = {breakdown.base}
                      </div>
                      <div style={{ fontFamily: 'monospace' }}>
                        BANT bonus = min(30, round(30 × ({breakdown.bant_confirmed}/4)^1.5 + 1.5 × {breakdown.bant_partial})) = {breakdown.bant_bonus}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        final = round(0.7 × {breakdown.base}) + {breakdown.bant_bonus} = {breakdown.weighted_base} + {breakdown.bant_bonus} = {breakdown.final}
                      </div>
                      <div style={{ marginTop: '6px', color: 'var(--muted-foreground)' }}>
                        The base works like a model score from the lead's profile. The BANT bonus grows faster with each
                        slot confirmed in conversation (0, 4, 11, 19, 30 points for 0–4 confirmed), so confirmed evidence
                        outweighs the profile once the customer states it. BANT source: {breakdown.bant_source}.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(lead.score_factors || []).length === 0 && (
                      <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>No score factors yet. Click Recalculate.</div>
                    )}
                    {(lead.score_factors || []).map((factor) => (
                      <div
                        key={factor.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: 'var(--muted)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
                            {factor.factor_name}
                            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted-foreground)', marginLeft: '6px' }}>
                              {factor.category === 'Qualification' ? 'added to final score' : 'profile points'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            {factor.explanation}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: factor.score_impact >= 0 ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {factor.score_impact >= 0 ? `+${factor.score_impact}` : factor.score_impact}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline: everything that happened to this lead, newest first (GET /api/leads/{id}/timeline) */}
              {activeTab === 'timeline' && (
                <div className="flex flex-col gap-3">
                  {timeline === null && <div className="text-sm text-muted-foreground">Loading…</div>}
                  {timeline?.length === 0 && <div className="text-sm text-muted-foreground">Nothing has happened yet.</div>}
                  <ol className="relative ml-2 border-l">
                    {(timeline || []).map((e, i) => (
                      <li key={i} className="mb-4 ml-4">
                        <span className={`absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-card ${
                          e.status === 'error' ? 'bg-danger' : e.status === 'warning' || e.status === 'handoff' ? 'bg-warning'
                          : e.kind === 'message' ? 'bg-brand' : e.kind === 'meeting' ? 'bg-success' : 'bg-muted-foreground'}`} />
                        <div className="text-[14px] font-medium">{e.title}</div>
                        {e.detail && <div className="line-clamp-3 text-[13px] text-muted-foreground">{e.detail}</div>}
                        <div className="text-xs text-muted-foreground">
                          {timeAgo(e.at)}{e.duration_ms != null ? ` · ${e.duration_ms} ms` : ''}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tab 3: Outreach Drafts */}
              {activeTab === 'outreach' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
                      Generated Outreach Message
                    </div>
                    {generatedOutreach?.content && (
                      <button
                        onClick={() => copyToClipboard(generatedOutreach.content)}
                        className="btn btn-secondary btn-sm"
                      >
                        {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy text'}</span>
                      </button>
                    )}
                  </div>

                  <div style={{
                    padding: '14px',
                    borderRadius: '6px',
                    background: 'var(--muted)',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: 'var(--foreground)',
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
            background: 'var(--card)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Sales Assistant Recommendation
              </div>

              <div style={{
                padding: '12px',
                borderRadius: '6px',
                background: 'var(--success-soft)',
                border: '1px solid var(--success-border)',
                marginBottom: '10px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)', marginBottom: '4px' }}>
                  {lead.next_best_action || 'No next action yet'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--success)', lineHeight: 1.4 }}>
                  {lead.next_best_action_reason || ''}
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
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '8px' }}>
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
