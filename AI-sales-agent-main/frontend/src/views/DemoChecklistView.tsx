import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead } from '../types';

interface DemoChecklistViewProps {
  leads: Lead[];
  onNavigate: (view: string) => void;
  onOpenChat: (lead: Lead) => void;
  onOpenLead: (lead: Lead) => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

const Say: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is still visible to type */
    }
  };
  return (
    <button onClick={copy} title="Copy" className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2 py-0.5 font-mono text-[13px] hover:bg-accent">
      “{text}” {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 text-muted-foreground" />}
    </button>
  );
};

const Sample: React.FC<{ name: string }> = ({ name }) => (
  <a href={`/api/demo/samples/${name}`} download className="inline-flex items-center gap-1 text-[14px] text-brand underline-offset-4 hover:underline">
    <Download className="size-3.5" /> {name}
  </a>
);

export const DemoChecklistView: React.FC<DemoChecklistViewProps> = ({ leads, onNavigate, onOpenChat, onOpenLead, onResetDemo, isResetting }) => {
  const kavya = leads.find((l) => l.name === 'Kavya Shah');

  const steps: { title: string; body: React.ReactNode; actions: React.ReactNode }[] = [
    {
      title: 'Upload the bulk order price list',
      body: (
        <>
          <p>Before this step the assistant cannot quote bulk prices. Download <Sample name="bulk_order_price_list.txt" />, then in
            Knowledge base click <b>Upload document</b>, title <Say text="Bulk order price list" />, category Pricing.</p>
          <p>Show it working: in <b>Test a question</b> ask <Say text="What is the bulk price for 400 oversized tees?" /> and point at the matched source and its score.</p>
        </>
      ),
      actions: <Button variant="outline" size="sm" onClick={() => onNavigate('knowledge')}>Knowledge base <ArrowRight /></Button>,
    },
    {
      title: 'Import 5 leads and explain the Hot one',
      body: (
        <>
          <p>Download <Sample name="leads.csv" />, then on Leads click <b>Import CSV</b>. Each lead is profiled, checked for BANT and scored.</p>
          <p>Kavya Shah comes out <b>Hot</b>. Open her and go to <b>Score breakdown</b>: large order (25), needs it within 10 days (20),
            wholesale buyer (15), website form (10), and all four BANT answers stated on the form (+30).</p>
        </>
      ),
      actions: (
        <>
          <Button variant="outline" size="sm" onClick={() => onNavigate('leads')}>Leads <ArrowRight /></Button>
          {kavya && <Button variant="outline" size="sm" onClick={() => onOpenLead(kavya)}>Open Kavya Shah</Button>}
        </>
      ),
    },
    {
      title: 'Talk to her as the customer',
      body: (
        <>
          <p>Open Kavya's conversation, keep <b>Play the customer</b> on, and send, one at a time:</p>
          <div className="flex flex-wrap gap-2">
            <Say text="What is the bulk price for 400 oversized tees?" />
            <Say text="That's too expensive" />
            <Say text="Can we do a call on Friday?" />
          </div>
          <p>Point at the agent tag on each reply (Knowledge, Objection, Scheduling) and the source document under the price answer.</p>
        </>
      ),
      actions: kavya
        ? <Button size="sm" onClick={() => onOpenChat(kavya)}>Open Kavya's conversation <ArrowRight /></Button>
        : <span className="text-sm text-muted-foreground">Do step 2 first.</span>,
    },
    {
      title: 'Show the meeting, the CRM record and BANT',
      body: (
        <p>The Scheduling agent booked the first free slot on Friday. Meetings shows it; CRM pipeline has Kavya under
          <b> Meeting Scheduled</b>; the lead panel and lead details show BANT with the evidence and the timeline of everything that happened.</p>
      ),
      actions: (
        <>
          <Button variant="outline" size="sm" onClick={() => onNavigate('meetings')}>Meetings <ArrowRight /></Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('crm')}>CRM pipeline <ArrowRight /></Button>
          {kavya && <Button variant="outline" size="sm" onClick={() => onOpenLead(kavya)}>Lead details</Button>}
        </>
      ),
    },
    {
      title: 'Hand the conversation to a human',
      body: (
        <>
          <p>In the same conversation send <Say text="I want to talk to a manager" />. The badge turns to <b>Human has taken over</b> and the AI stops answering.</p>
          <p>On the Dashboard, <b>Need a human</b> shows 1 and the handoff is first in <b>Needs your attention</b>.</p>
        </>
      ),
      actions: <Button variant="outline" size="sm" onClick={() => onNavigate('dashboard')}>Dashboard <ArrowRight /></Button>,
    },
  ];

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2>Demo checklist</h2>
          <p>Five steps that show the whole flow. Start with a reset so everyone sees the same data.</p>
        </div>
        <Button variant="outline" onClick={onResetDemo} disabled={isResetting}>
          <RotateCcw className={isResetting ? 'spin' : ''} /> {isResetting ? 'Resetting…' : 'Reset demo data'}
        </Button>
      </div>

      {steps.map((s, i) => (
        <Card key={s.title} className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-3 text-[16px]">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{i + 1}</span>
              {s.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pl-15 [&_p]:text-[14px] [&_p]:text-foreground">
            {s.body}
            <div className="flex flex-wrap gap-2 pt-1">{s.actions}</div>
          </CardContent>
        </Card>
      ))}

      <Card className="gap-2 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-[15px]">Good to know</CardTitle>
          <CardDescription>
            Everything works without internet except the language model and Chrome's speech recognition. Without a model, replies come
            from the rule-based fallback and are tagged "template". BANT updates from the conversation and the LLM call summary need the model.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
