import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Flame, HelpCircle, MailWarning, Plus, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardMetrics, Lead, Meeting, FollowUp } from '../types';
import { api } from '../services/api';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  leads: Lead[];
  meetings: Meeting[];
  followups: FollowUp[];
  onNavigate: (view: string) => void;
  onOpenLead: (lead: Lead) => void;
}

interface Overview {
  cards: { key: string; label: string; value: number; formula: string }[];
  attention: { kind: string; lead_id: number | null; lead_name: string | null; text: string; at: string | null }[];
  feed: { id: number; agent: string; text: string; at: string; status: string; duration_ms: number | null }[];
}

// Pipeline groups shown on the dashboard; every stage belongs to exactly one group so the counts add up.
const PIPELINE: { label: string; stages: string[] }[] = [
  { label: 'New', stages: ['New'] },
  { label: 'Contacted', stages: ['Contacted', 'Engaged', 'Nurture'] },
  { label: 'Qualified', stages: ['Qualified'] },
  { label: 'Meeting', stages: ['Meeting Scheduled', 'Proposal', 'Negotiation'] },
  { label: 'Won', stages: ['Won'] },
  { label: 'Lost', stages: ['Lost'] },
];

const ATTENTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  handoff: UserRound, hot_uncontacted: Flame, unanswered: HelpCircle, email_failed: MailWarning,
};

export const DashboardView: React.FC<DashboardViewProps> = ({ metrics, leads, onNavigate, onOpenLead }) => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboardOverview()
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the dashboard'));
  }, [metrics]); // refetch whenever the app refreshes its data

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const stageCount = (stages: string[]) =>
    (metrics?.funnel || []).filter((f) => stages.includes(f.stage)).reduce((n, f) => n + f.count, 0);
  const openLead = (id: number | null) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) onOpenLead(lead);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2>{greeting}</h2>
          <p>What needs you today, and what the AI has done. Every number comes from the database.</p>
        </div>
        <Button onClick={() => onNavigate('leads')}>
          <Plus /> New lead
        </Button>
      </div>

      {error && <div className="text-sm text-danger">{error}</div>}

      {/* 1. Four number cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(overview?.cards || []).map((c) => (
          <Card key={c.key} className="gap-1 py-5" title={c.formula}>
            <CardContent className="px-5">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {c.label} <span className="cursor-help text-xs" aria-label={`Formula: ${c.formula}`}>ⓘ</span>
              </div>
              <div className={cn('mt-1 text-3xl font-semibold', c.key === 'need_human' && c.value > 0 && 'text-warning')}>
                {c.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Lead pipeline row */}
      <Card className="gap-3 py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-[15px]">Lead pipeline</CardTitle>
          <CardDescription>
            {metrics?.kpis.total_leads ?? 0} leads in total. Hover a step to see which stages it includes.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <div className="flex flex-wrap items-center gap-2">
            {PIPELINE.map((g, i) => (
              <React.Fragment key={g.label}>
                <button
                  onClick={() => onNavigate('crm')}
                  title={`Stages: ${g.stages.join(', ')}`}
                  className={cn(
                    'min-w-28 flex-1 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-accent',
                    g.label === 'Won' && 'border-success-border bg-success-soft',
                    g.label === 'Lost' && 'border-danger-border bg-danger-soft',
                  )}
                >
                  <div className="text-sm text-muted-foreground">{g.label}</div>
                  <div className="text-2xl font-semibold">{stageCount(g.stages)}</div>
                </button>
                {i < PIPELINE.length - 2 && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. Needs your attention */}
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <AlertTriangle className="size-4 text-warning" /> Needs your attention
            </CardTitle>
            <CardDescription>Handoffs, hot leads nobody has talked to, questions the knowledge base could not answer, failed emails.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            {overview && overview.attention.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing needs you right now.</div>
            )}
            <ul className="divide-y">
              {(overview?.attention || []).map((a, i) => {
                const Icon = ATTENTION_ICON[a.kind] || AlertTriangle;
                return (
                  <li key={i}>
                    <button onClick={() => openLead(a.lead_id)} className="flex w-full items-start gap-3 py-3 text-left hover:bg-accent/50">
                      <Icon className="mt-0.5 size-4 shrink-0 text-warning" />
                      <span className="flex-1 text-[14px]">{a.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* 3. What the AI did */}
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-[15px]">What the AI did</CardTitle>
            <CardDescription>The latest agent runs, written by the backend when each agent ran (time measured in ms).</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            {overview && overview.feed.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No agent activity yet.</div>
            )}
            <ul className="space-y-3">
              {(overview?.feed || []).map((f) => (
                <li key={f.id} className="flex gap-3">
                  <span className={cn('mt-1.5 size-2 shrink-0 rounded-full',
                    f.status === 'error' ? 'bg-danger' : f.status === 'warning' || f.status === 'handoff' ? 'bg-warning' : 'bg-success')} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px]">{f.text}</div>
                    <div className="text-xs text-muted-foreground">
                      {f.agent} · {timeAgo(f.at)}{f.duration_ms != null ? ` · ${f.duration_ms} ms` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="link" className="mt-2 px-0" onClick={() => onNavigate('agents')}>
              Full activity log <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
