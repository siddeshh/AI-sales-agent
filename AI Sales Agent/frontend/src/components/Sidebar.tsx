import React from 'react';
import { 
  LayoutDashboard, Users, MessageSquare, Calendar, 
  Clock, Kanban, BookOpen, BarChart2, Cpu, 
  Settings, Building2, UserCircle2 
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  activeIndustry: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  badge?: string;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, activeIndustry }) => {
  const navSections: NavSection[] = [
    {
      title: null,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Sales',
      items: [
        { id: 'leads', label: 'Leads', icon: Users, badge: '3' },
        { id: 'conversations', label: 'Conversations', icon: MessageSquare },
        { id: 'followups', label: 'Follow-ups', icon: Clock },
        { id: 'meetings', label: 'Meetings', icon: Calendar },
      ],
    },
    {
      title: 'AI Workforce',
      items: [
        { id: 'agents', label: 'AI Agents', icon: Cpu, badge: '11' },
        { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
      ],
    },
    {
      title: 'Management',
      items: [
        { id: 'crm', label: 'CRM Pipeline', icon: Kanban },
        { id: 'analytics', label: 'Analytics', icon: BarChart2 },
      ],
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside style={{
      width: '240px',
      background: '#ffffff',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100vh',
      userSelect: 'none',
    }}>
      {/* Brand Header */}
      <div style={{
        height: '56px',
        padding: '0 16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <div style={{
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '-0.02em',
        }}>
          S
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
            Sales Workforce
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Autonomous AI
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {navSections.map((sec, secIdx) => (
          <div key={secIdx} style={{ marginBottom: '16px' }}>
            {sec.title && (
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '4px 10px 6px',
              }}>
                {sec.title}
              </div>
            )}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      background: isActive ? '#f1f5f9' : 'transparent',
                      color: isActive ? '#0f172a' : '#475569',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 500,
                      transition: 'background-color 0.1s ease, color 0.1s ease',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#0f172a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#475569';
                      }
                    }}
                  >
                    <Icon size={16} color={isActive ? '#0f172a' : '#64748b'} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: isActive ? '#e2e8f0' : '#f1f5f9',
                        color: '#475569',
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Profile */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            AT
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
              Alex Turner
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Sales Representative
            </div>
          </div>
        </div>

        <div style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: '#16a34a',
        }} title="System Online (11 Agents Active)" />
      </div>
    </aside>
  );
};
