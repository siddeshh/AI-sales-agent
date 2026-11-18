import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowRight, CheckCircle2 } from 'lucide-react';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: string) => void;
}

export const DemoTourModal: React.FC<DemoTourModalProps> = ({ isOpen, onClose, onNavigateToView }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const STEPS = [
    {
      step: 1,
      title: '1. Lead Ingestion',
      agent: 'Lead Research Agent',
      view: 'leads',
      description: 'Create or import an inbound prospect (Rahul Sharma, ₹80 Lakh budget, Pune, 2 BHK, 30-day timeline). Inbound webhook or manual CSV triggers intake.',
      actionLabel: 'View Leads Table',
    },
    {
      step: 2,
      title: '2. Prospect Profiling & Context',
      agent: 'Lead Research Agent',
      view: 'leads',
      description: 'The Lead Research Agent analyzes corporate background (Senior IT Architect), maps commuter pain points to the IT cluster, and detects buying motivations.',
      actionLabel: 'Inspect Lead Dossier',
    },
    {
      step: 3,
      title: '3. Explainable Lead Scoring',
      agent: 'Lead Scoring Agent',
      view: 'leads',
      description: 'Calculates a transparent score: 87/100 (Hot, 82% conversion probability). Evaluated across Budget (+25), Need (+15), Urgency (+20), and Engagement (+15).',
      actionLabel: 'View Score Breakdown',
    },
    {
      step: 4,
      title: '4. Factor Explainability',
      agent: 'Lead Scoring Agent',
      view: 'leads',
      description: 'Transparent attribution: Displays exactly why the score was assigned without black-box magic.',
      actionLabel: 'Check Factor Cards',
    },
    {
      step: 5,
      title: '5. Personalized Outreach',
      agent: 'Sales Communication Agent',
      view: 'leads',
      description: 'Generates tailored email and WhatsApp outreach referencing preferred floor plan, location, and pre-approved home loan rates.',
      actionLabel: 'Generate Outreach',
    },
    {
      step: 6,
      title: '6. Customer Response',
      agent: 'Sales Communication Agent',
      view: 'conversations',
      description: 'Customer replies on chat: "I am looking for a 2 BHK apartment in Pune under 80 lakh."',
      actionLabel: 'Open Conversations',
    },
    {
      step: 7,
      title: '7. Intent & Sentiment Analysis',
      agent: 'Workforce Orchestrator',
      view: 'conversations',
      description: 'NLP identifies customer intent ("Property Inquiry") and positive sentiment, synchronizing prospect state in memory.',
      actionLabel: 'Check Live Sentiment',
    },
    {
      step: 8,
      title: '8. Product / Property Inquiry',
      agent: 'Knowledge RAG Agent',
      view: 'conversations',
      description: 'Customer asks specific questions regarding township amenities and RERA possession schedule.',
      actionLabel: 'Simulate Question in Chat',
    },
    {
      step: 9,
      title: '9. Semantic RAG Search',
      agent: 'Knowledge RAG Agent',
      view: 'knowledge',
      description: 'Semantic vector retrieval pulls verified chunks from official project brochures and RERA filings with cosine similarity scoring.',
      actionLabel: 'Inspect Knowledge Base',
    },
    {
      step: 10,
      title: '10. Grounded Answer Synthesis',
      agent: 'Knowledge RAG Agent',
      view: 'conversations',
      description: 'AI answers with certified brochure citations: December 2026 possession, MahaRERA P52100034981, and 25,000 sq.ft clubhouse. Zero hallucinations.',
      actionLabel: 'View Citations in Chat',
    },
    {
      step: 11,
      title: '11. Price Objection Raised',
      agent: 'Objection Handling Agent',
      view: 'conversations',
      description: 'Customer expresses budget concern: "₹80 lakh is slightly on the higher side of my budget. Are there discounts?"',
      actionLabel: 'Trigger Objection in Chat',
    },
    {
      step: 12,
      title: '12. Objection Resolution',
      agent: 'Objection Handling Agent',
      view: 'conversations',
      description: 'Deploys Value Reframing and 10:90 Developer Subvention Scheme (pay 10% now, zero pre-EMI until possession).',
      actionLabel: 'View Handled Response',
    },
    {
      step: 13,
      title: '13. High Buying Intent',
      agent: 'Qualification Agent',
      view: 'conversations',
      description: 'Customer agrees subvention financing is viable and requests to tour the model flat this weekend.',
      actionLabel: 'Observe State Transition',
    },
    {
      step: 14,
      title: '14. BANT Qualification Met',
      agent: 'Qualification Agent',
      view: 'leads',
      description: 'All 4 BANT criteria validated: Budget (₹80L), Authority (Self), Need (2 BHK East-facing), Timeline (30 days). Marked "Qualified".',
      actionLabel: 'View BANT Status',
    },
    {
      step: 15,
      title: '15. Propose Calendar Slots',
      agent: 'Scheduling Agent',
      view: 'conversations',
      description: 'Scheduling Agent checks calendar availability within working hours and proposes Saturday 11 AM and 3 PM slots.',
      actionLabel: 'View Proposed Slots',
    },
    {
      step: 16,
      title: '16. Meeting Confirmed',
      agent: 'Scheduling Agent',
      view: 'meetings',
      description: 'VIP Site Visit confirmed for Saturday 11 AM at Hinjawadi Experience Centre. Calendar pass generated.',
      actionLabel: 'Open Meetings Calendar',
    },
    {
      step: 17,
      title: '17. Automatic CRM Update',
      agent: 'CRM Agent',
      view: 'crm',
      description: 'CRM Agent shifts lead stage to "Meeting Scheduled". Deal value of ₹80 Lakh added to pipeline column.',
      actionLabel: 'Open CRM Pipeline',
    },
    {
      step: 18,
      title: '18. Follow-up Scheduled',
      agent: 'Follow-up Agent',
      view: 'followups',
      description: 'Follow-up Agent schedules Day 2 reminder with 3D model walkthrough and Google Maps location pin.',
      actionLabel: 'View Follow-up Cadence',
    },
    {
      step: 19,
      title: '19. Analytics Updated',
      agent: 'Analytics Agent',
      view: 'analytics',
      description: 'Conversion velocity, Hot Leads metric, and meeting counts immediately update across executive charts.',
      actionLabel: 'View Sales Analytics',
    },
    {
      step: 20,
      title: '20. Next Best Action Recommendation',
      agent: 'Analytics Agent',
      view: 'dashboard',
      description: 'Workforce recommends: "Prepare VIP site welcome kit and high-floor floor plans for Rahul Sharma before Saturday visit."',
      actionLabel: 'Review Dashboard Next Action',
    },
  ];

  const current = STEPS[currentStep];

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '580px', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
              Sales Lifecycle Walkthrough
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Step {current.step} of 20 • Multi-Agent Autonomous Flow
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '4px',
          background: '#f1f5f9',
          borderRadius: '2px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${((currentStep + 1) / 20) * 100}%`,
            height: '100%',
            background: '#2563eb',
            transition: 'width 0.2s ease',
          }} />
        </div>

        {/* Card Body */}
        <div style={{
          padding: '18px',
          borderRadius: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
              {current.title}
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: '4px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
            }}>
              {current.agent}
            </span>
          </div>

          <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#475569' }}>
            {current.description}
          </p>
        </div>

        {/* Footer Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft size={14} />
            <span>Previous</span>
          </button>

          <button
            onClick={() => {
              onNavigateToView(current.view);
              onClose();
            }}
            className="btn btn-primary btn-sm"
          >
            <span>{current.actionLabel}</span>
            <ArrowRight size={13} />
          </button>

          <button
            onClick={() => setCurrentStep((prev) => Math.min(19, prev + 1))}
            disabled={currentStep === 19}
            className="btn btn-secondary btn-sm"
          >
            <span>Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
