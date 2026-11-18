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
      title: '1. Lead Intake',
      agent: 'Research Agent',
      view: 'leads',
      description: 'Sneha Kulkarni, HR Manager at Finvolve Technologies (Pune), asks on the website form for 250 hoodies with an embroidered logo for a company offsite, within 2 weeks.',
      actionLabel: 'Open Leads',
    },
    {
      step: 2,
      title: '2. Buyer Profile',
      agent: 'Research Agent',
      view: 'leads',
      description: 'The Research agent classifies her as a corporate / institutional buyer and notes typical concerns: a hard event deadline and logo quality.',
      actionLabel: 'View Lead Profile',
    },
    {
      step: 3,
      title: '3. Explainable Score',
      agent: 'Lead Qualification Agent',
      view: 'leads',
      description: 'The Scoring agent adds six factors: order value / quantity fit, timeline urgency, buyer type, engagement, source quality and BANT evidence. The score is exactly their sum.',
      actionLabel: 'View Score',
    },
    {
      step: 4,
      title: '4. Factor Breakdown',
      agent: 'Lead Qualification Agent',
      view: 'leads',
      description: 'Open the lead to see each factor with its points and the reason, e.g. a large bulk order and a 14-day deadline.',
      actionLabel: 'Open Lead Details',
    },
    {
      step: 5,
      title: '5. Outreach Draft',
      agent: 'Communication Agent',
      view: 'leads',
      description: 'Draft a WhatsApp or email introduction with the catalogue and bulk price list. Drafts are not sent automatically.',
      actionLabel: 'Draft Outreach',
    },
    {
      step: 6,
      title: '6. Customer Message',
      agent: 'Communication Agent',
      view: 'conversations',
      description: 'Sneha writes: "We need around 250 hoodies with our logo embroidered for a company offsite."',
      actionLabel: 'Open Conversations',
    },
    {
      step: 7,
      title: '7. Intent & Sentiment',
      agent: 'Orchestrator',
      view: 'conversations',
      description: 'The orchestrator classifies the message (intent, sentiment, objection type) with the LLM, or with keyword rules when no model is configured.',
      actionLabel: 'See Classification',
    },
    {
      step: 8,
      title: '8. Product Question',
      agent: 'Knowledge Agent',
      view: 'conversations',
      description: 'Product and price questions go to the Knowledge agent.',
      actionLabel: 'Ask a Question',
    },
    {
      step: 9,
      title: '9. Semantic Search',
      agent: 'Knowledge Agent',
      view: 'knowledge',
      description: 'MiniLM embeddings find the closest chunks in the catalogue, bulk price list, shipping policy and customisation FAQ. Try it in Knowledge Base, Test a question.',
      actionLabel: 'Test a Question',
    },
    {
      step: 10,
      title: '10. Grounded Answer',
      agent: 'Knowledge Agent',
      view: 'conversations',
      description: 'The answer quotes only the retrieved text, e.g. the French Terry Hoodie slab price and the embroidery charge, with sources. Numbers not in the sources are blocked.',
      actionLabel: 'View Answer & Sources',
    },
    {
      step: 11,
      title: '11. Objection Raised',
      agent: 'Objection Agent',
      view: 'conversations',
      description: 'Sneha: "The offsite is in 12 days. Your normal lead time is too long for us." This is a delivery-time objection.',
      actionLabel: 'See Objection',
    },
    {
      step: 12,
      title: '12. Objection Handled',
      agent: 'Objection Agent',
      view: 'conversations',
      description: 'The playbook offers express production (5-7 business days for up to 250 pieces, 12% surcharge), as stated in the shipping policy.',
      actionLabel: 'View Reply',
    },
    {
      step: 13,
      title: '13. Buying Intent',
      agent: 'Lead Qualification Agent',
      view: 'conversations',
      description: 'Sneha asks for a call. The Qualification agent re-reads the conversation and updates the BANT slots with quotes as evidence.',
      actionLabel: 'See BANT Update',
    },
    {
      step: 14,
      title: '14. BANT Status',
      agent: 'Lead Qualification Agent',
      view: 'leads',
      description: 'Budget, authority, need and timeline are each marked absent, partial or confirmed on the lead.',
      actionLabel: 'View Qualification',
    },
    {
      step: 15,
      title: '15. Propose Slots',
      agent: 'Scheduling Agent',
      view: 'conversations',
      description: 'The Scheduling agent offers open slots in showroom hours for a sample review call (no external calendar is connected yet).',
      actionLabel: 'View Slots',
    },
    {
      step: 16,
      title: '16. Meeting Booked',
      agent: 'Scheduling Agent',
      view: 'meetings',
      description: 'A product demo / sample review call is booked as a video call (no link or calendar invite is created; Google Calendar is demo mode); showroom visits go to the Indiranagar studio.',
      actionLabel: 'Open Meetings',
    },
    {
      step: 17,
      title: '17. CRM Update',
      agent: 'CRM Agent',
      view: 'crm',
      description: 'The CRM agent moves the lead to Meeting Scheduled and records the next best action in the activity log.',
      actionLabel: 'Open CRM Pipeline',
    },
    {
      step: 18,
      title: '18. Follow-up Queued',
      agent: 'Follow-up Agent',
      view: 'followups',
      description: 'Follow-up tasks are queued (catalogue, customisation options, sample call offer, final check-in). Email follow-ups are sent over SMTP when you click Send email; WhatsApp ones are simulated (demo mode).',
      actionLabel: 'Open Follow-ups',
    },
    {
      step: 19,
      title: '19. Analytics',
      agent: 'Analytics Agent',
      view: 'analytics',
      description: 'Funnel, score tiers and the objection breakdown are computed from the database, so they change as you work.',
      actionLabel: 'View Analytics',
    },
    {
      step: 20,
      title: '20. Human Handoff',
      agent: 'Orchestrator',
      view: 'conversations',
      description: 'If a customer asks for a manager, or the knowledge base cannot answer twice in a row, the Orchestrator hands the conversation to a human. Every agent run appears in the AI Agents activity log with its measured time.',
      actionLabel: 'Back to Conversations',
    },
  ];

  const current = STEPS[currentStep];

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '580px', padding: '24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--foreground)' }}>
              Sales Lifecycle Walkthrough
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
              Step {current.step} of 20 • Guided walkthrough
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
          background: 'var(--muted)',
          borderRadius: '2px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${((currentStep + 1) / 20) * 100}%`,
            height: '100%',
            background: 'var(--brand)',
            transition: 'width 0.2s ease',
          }} />
        </div>

        {/* Card Body */}
        <div style={{
          padding: '18px',
          borderRadius: '6px',
          background: 'var(--muted)',
          border: '1px solid var(--border)',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
              {current.title}
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: '4px',
              background: 'var(--brand-soft)',
              color: 'var(--brand)',
              border: '1px solid var(--brand-border)',
            }}>
              {current.agent}
            </span>
          </div>

          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
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
