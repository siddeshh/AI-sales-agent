import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Hand, Search, Send, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Lead, Conversation, Message } from '../types';
import { api } from '../services/api';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/format';

interface ConversationsViewProps {
  leads: Lead[];
  activeLeadId?: number;
  onRefreshLeads: () => void;
  onOpenLead?: (lead: Lead) => void;
}

const PRESET_PROMPTS = [
  'Hi, do you take bulk orders for printed tees?',
  'What is the price for 200 oversized tees?',
  'That is too expensive, another supplier quoted less.',
  'I only need about 30 pieces to start. Is that possible?',
  'How long will delivery take for 150 embroidered hoodies?',
  'Can we do a sample review call on Friday?',
  'I want to talk to a manager',
];

const BANT_KEYS: { key: 'budget' | 'authority' | 'need' | 'timeline'; label: string; flag: keyof Lead }[] = [
  { key: 'budget', label: 'Budget', flag: 'budget_qualified' },
  { key: 'authority', label: 'Authority', flag: 'authority_qualified' },
  { key: 'need', label: 'Need', flag: 'need_qualified' },
  { key: 'timeline', label: 'Timeline', flag: 'timeline_qualified' },
];

const parse = <T,>(s?: string | null): T | null => {
  try {
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
};

const tierClass = (tier?: string) =>
  tier === 'Hot' ? 'badge-red' : tier === 'Qualified' ? 'badge-green' : tier === 'Warm' ? 'badge-amber' : 'badge-gray';

export const ConversationsView: React.FC<ConversationsViewProps> = ({ leads, activeLeadId, onRefreshLeads, onOpenLead }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<number | undefined>(activeLeadId);
  const [channel, setChannel] = useState<'chat' | 'whatsapp' | 'email'>('chat');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [playCustomer, setPlayCustomer] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Inbox: most recently contacted first, then the rest by name
  const inbox = useMemo(() => [...leads]
    .filter((l) => `${l.name} ${l.company || ''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.last_contacted || '').localeCompare(a.last_contacted || '') || a.name.localeCompare(b.name)), [leads, query]);
  const leadId = selectedLeadId ?? inbox[0]?.id;
  const lead = leads.find((l) => l.id === leadId);

  const load = async () => {
    if (!leadId) return;
    try {
      setConversation(await api.getConversation(leadId, channel));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the conversation');
    }
  };

  useEffect(() => { load(); }, [leadId, channel]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation?.messages?.length, busy]);

  const send = async (text: string) => {
    if (!text.trim() || !leadId) return;
    setInput('');
    setBusy(true);
    setError('');
    try {
      await api.sendChatMessage(leadId, text, channel, !playCustomer);
      await load();
      onRefreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Message failed');
    } finally {
      setBusy(false);
    }
  };

  const toggleTakeover = async () => {
    if (!conversation) return;
    try {
      await api.toggleHandoff(conversation.id, !conversation.human_takeover);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change takeover');
    }
  };

  const bant = parse<Record<string, { status: string; evidence: string }>>(lead?.bant_json);
  const takeover = !!conversation?.human_takeover;

  return (
    <div className="grid h-[calc(100vh-104px)] grid-cols-[260px_1fr_300px] overflow-hidden rounded-xl border bg-card">
      {/* Inbox */}
      <aside className="flex min-h-0 flex-col border-r">
        <div className="border-b p-3">
          <div className="flex items-center gap-2 rounded-md border px-2">
            <Search className="size-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads"
              className="h-9 w-full bg-transparent text-[14px] outline-none" />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {inbox.map((l) => (
            <li key={l.id}>
              <button onClick={() => setSelectedLeadId(l.id)}
                className={cn('w-full border-b px-4 py-3 text-left hover:bg-accent', l.id === leadId && 'bg-accent')}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-medium">{l.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(l.last_contacted)}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{l.company || l.requirements || 'No company'}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Chat */}
      <section className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold">{lead?.name || 'Select a lead'}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {(['chat', 'whatsapp', 'email'] as const).map((ch) => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={cn('rounded px-1.5 py-0.5 capitalize', channel === ch ? 'bg-accent text-foreground' : 'hover:text-foreground')}>
                  {ch}
                </button>
              ))}
              {channel !== 'chat' && (
                <span className="badge badge-amber" title={`No ${channel} integration: these messages stay in this app.`}>
                  Demo mode — simulated
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {takeover
              ? <span className="badge badge-amber">Human has taken over</span>
              : <span className="badge badge-green">AI is replying</span>}
            <Button variant={takeover ? 'outline' : 'default'} size="sm" onClick={toggleTakeover} disabled={!conversation}>
              {takeover ? <><Undo2 /> Hand back to AI</> : <><Hand /> Take over</>}
            </Button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-background px-5 py-4">
          {(conversation?.messages || []).length === 0 && (
            <div className="pt-10 text-center text-sm text-muted-foreground">No messages on this channel yet.</div>
          )}
          {(conversation?.messages || []).map((m) => <Bubble key={m.id} m={m} leadName={lead?.name} />)}
          {busy && <div className="text-xs text-muted-foreground">{playCustomer && !takeover ? 'The AI is answering…' : 'Sending…'}</div>}
          <div ref={endRef} />
        </div>

        <footer className="border-t p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" title="Example customer messages">
            {PRESET_PROMPTS.map((p) => (
              <button key={p} onClick={() => { setPlayCustomer(true); send(p); }} disabled={busy}
                className="shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                {p}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2">
            <label className="flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground" title="On: you type as the customer and the AI answers. Off: you type as the human sales rep.">
              <Switch checked={playCustomer} onCheckedChange={setPlayCustomer} /> Play the customer
            </label>
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy || !lead}
              placeholder={playCustomer ? `Type as ${lead?.name?.split(' ')[0] || 'the customer'}…` : 'Type as the human sales rep…'}
              className="form-input" />
            <Button type="submit" disabled={busy || !input.trim()}><Send /> Send</Button>
          </form>
          {error && <div className="mt-2 text-sm text-danger">{error}</div>}
          {takeover && playCustomer && (
            <div className="mt-2 text-xs text-muted-foreground">A human has taken over, so the AI will not answer customer messages.</div>
          )}
        </footer>
      </section>

      {/* Lead panel */}
      <aside className="min-h-0 space-y-5 overflow-y-auto border-l p-4">
        {lead && (
          <>
            <div>
              <div className="text-[15px] font-semibold">{lead.name}</div>
              <div className="text-xs text-muted-foreground">{[lead.job_title, lead.company, lead.location].filter(Boolean).join(' · ')}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl font-semibold">{lead.lead_score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
                <span className={cn('badge', tierClass(lead.score_category))}>{lead.score_category}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Stage: {lead.stage} · {lead.qualification_status}</div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">BANT</div>
              <ul className="space-y-2">
                {BANT_KEYS.map(({ key, label, flag }) => {
                  const slot = bant?.[key];
                  const status = slot?.status || (lead[flag] ? 'met on lead form' : 'not yet');
                  const cls = status === 'confirmed' || status === 'met on lead form' ? 'badge-green'
                    : status === 'partial' ? 'badge-amber' : 'badge-gray';
                  return (
                    <li key={key} className="rounded-md border p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-medium">{label}</span>
                        <span className={cn('badge', cls)}>{status}</span>
                      </div>
                      {slot?.evidence && <div className="mt-1 text-xs italic text-muted-foreground">"{slot.evidence}"</div>}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-1 text-xs text-muted-foreground">
                {bant ? 'From the conversation (quotes are the evidence).' : 'From the lead form; updates from the conversation when a language model is configured.'}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next best action</div>
              <div className="text-[14px]">{lead.next_best_action || '—'}</div>
              {lead.next_best_action_reason && <div className="text-xs text-muted-foreground">{lead.next_best_action_reason}</div>}
            </div>

            {onOpenLead && (
              <Button variant="outline" className="w-full" onClick={() => onOpenLead(lead)}>Open lead details</Button>
            )}
          </>
        )}
      </aside>
    </div>
  );
};

const Bubble: React.FC<{ m: Message; leadName?: string }> = ({ m, leadName }) => {
  const isCustomer = m.sender === 'customer';
  const isRep = m.sender === 'human_rep';
  const sources = parse<{ title: string; score?: number }[]>(m.sources_json) || [];
  return (
    <div className={cn('flex flex-col gap-1', isCustomer ? 'items-end' : 'items-start')}>
      <div className="text-xs text-muted-foreground">
        {isCustomer ? leadName : isRep ? 'Human rep' : (
          <span className="badge badge-blue" title={m.provider ? `Written by ${m.provider}` : undefined}>
            {m.agent_name || 'AI'}{m.provider === 'rules' ? ' · template' : m.provider === 'demo seed' ? ' · demo data' : ''}
          </span>
        )}
        <span className="ml-2">{timeAgo(m.created_at)}</span>
      </div>
      <div className={cn('max-w-[78%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed',
        isCustomer ? 'bg-primary text-primary-foreground' : isRep ? 'border border-warning-border bg-warning-soft' : 'border bg-card')}>
        {m.content}
      </div>
      {sources.length > 0 && (
        <div className="flex max-w-[78%] flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="size-3.5" /> Sources:
          {sources.map((s, i) => (
            <span key={i} className="badge badge-gray">{s.title}{s.score != null ? ` · ${s.score.toFixed(2)}` : ''}</span>
          ))}
        </div>
      )}
    </div>
  );
};
