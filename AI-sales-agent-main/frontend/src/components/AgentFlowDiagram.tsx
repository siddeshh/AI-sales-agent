import React from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';

// The real routing in backend/app/agents/orchestrator.py (see docs/architecture.md).
const Box: React.FC<{ title: string; sub?: string; strong?: boolean }> = ({ title, sub, strong }) => (
  <div className={`rounded-lg border px-3 py-2 text-center ${strong ? 'border-brand-border bg-brand-soft' : 'bg-card'}`}>
    <div className="text-[13px] font-medium">{title}</div>
    {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
  </div>
);

export const AgentFlowDiagram: React.FC = () => (
  <div className="card">
    <div className="mb-1 text-[15px] font-semibold">How agents hand off work</div>
    <p className="mb-4">A new lead is profiled and scored. Each customer message is read by the Orchestrator and sent to one agent.</p>

    <div className="flex flex-wrap items-center gap-2">
      <Box title="New lead" sub="form / API" />
      <ArrowRight className="size-4 text-muted-foreground" />
      <Box title="Research Agent" sub="buyer profile" />
      <ArrowRight className="size-4 text-muted-foreground" />
      <Box title="Lead Qualification Agent" sub="BANT + score" />
      <ArrowRight className="size-4 text-muted-foreground" />
      <Box title="CRM Agent" sub="stage: New" />
    </div>

    <div className="my-4 border-t" />

    <div className="flex flex-col items-center gap-2">
      <Box title="Customer message" />
      <ArrowDown className="size-4 text-muted-foreground" />
      <Box title="Orchestrator" sub="reads intent, updates BANT" strong />
      <ArrowDown className="size-4 text-muted-foreground" />
      <div className="grid w-full grid-cols-2 gap-2 lg:grid-cols-5">
        <Box title="Knowledge Agent" sub="question" />
        <Box title="Objection Agent" sub="price, MOQ, delivery…" />
        <Box title="Scheduling Agent" sub="wants a meeting" />
        <Box title="Communication Agent" sub="greeting / other" />
        <Box title="Human rep" sub="asks for a person, or 2 unanswered questions" />
      </div>
      <ArrowDown className="size-4 text-muted-foreground" />
      <div className="flex flex-wrap justify-center gap-2">
        <Box title="Lead Qualification Agent" sub="re-scores" />
        <Box title="CRM Agent" sub="stage, next action" />
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
      Also: <span className="badge badge-gray">Follow-up Agent: email via SMTP, WhatsApp simulated</span>
      <span className="badge badge-gray">Voice Agent: browser voice session</span>
      <span className="badge badge-gray">Analytics Agent: dashboard numbers</span>
    </div>
  </div>
);
