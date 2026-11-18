import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, PhoneCall, Calendar, BookOpen, Clock, Kanban, BarChart2, Cpu, Settings, Home, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  leadsCount: number;
}

// Plain-word navigation, in the order the team asked for.
const NAV: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'voice', label: 'Voice call', icon: PhoneCall },
  { id: 'meetings', label: 'Meetings', icon: Calendar },
  { id: 'knowledge', label: 'Knowledge base', icon: BookOpen },
  { id: 'followups', label: 'Follow-ups', icon: Clock },
  { id: 'crm', label: 'CRM pipeline', icon: Kanban },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'agents', label: 'Agents', icon: Cpu },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'demo', label: 'Demo checklist', icon: ListChecks },
];

export const VIEW_TITLES: Record<string, string> = Object.fromEntries(NAV.map((n) => [n.id, n.label]));

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, leadsCount }) => (
  <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
    <Link to="/" className="flex items-center gap-2.5 px-5 py-4 hover:opacity-80">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        N
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold">Nova</div>
        <div className="text-xs text-muted-foreground">AI sales assistant</div>
      </div>
    </Link>

    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
      {NAV.map(({ id, label, icon: Icon }) => {
        const active = currentView === id;
        return (
          <button
            key={id}
            onClick={() => onSelectView(id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[14px] transition-colors',
              active
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {id === 'leads' && <span className="text-xs text-muted-foreground">{leadsCount}</span>}
          </button>
        );
      })}
    </nav>

    <div className="border-t border-sidebar-border px-3 py-3">
      <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-[14px] text-muted-foreground hover:bg-sidebar-accent">
        <Home className="size-4" /> Project home
      </Link>
      <div className="px-3 pt-2 text-xs text-muted-foreground">Signed in as Alex Turner · demo user</div>
    </div>
  </aside>
);
