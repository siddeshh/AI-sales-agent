import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Users, MessageSquare, Phone, BookOpen, AlertCircle,
  Calendar as CalendarIcon, Database, Clock, BarChart2, Play, ArrowRight,
  Search, ShieldAlert, Mail, PhoneCall, ChevronRight, Check, Send, AlertTriangle, Cpu, CircleDot, Server, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import {
  initialLeads, initialAgents, ragDocuments, ragSampleQueries,
  initialObjections, initialCrmLogs, initialActivities, initialChatTranscript
} from './mockData';
import type { Lead, Agent, Message, Objection, CRMLog, RAGTrace, AgentActivity, LeadStatus } from './types';

// Waveform Component
const Waveform: React.FC<{ active: boolean; color: string; speed?: number }> = ({ active, color, speed = 60 }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setPhase(p => (p + 0.25) % (Math.PI * 2));
    }, speed);
    return () => clearInterval(interval);
  }, [active, speed]);

  const points = 35;
  const height = 80;
  const width = 350;
  const barWidth = width / points;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <g>
        {Array.from({ length: points }).map((_, i) => {
          const angle = (i / points) * Math.PI * 5 + phase;
          const ampMultiplier = active ? Math.abs(Math.sin(angle)) * 0.7 + 0.3 : 0.05;
          const barHeight = active 
            ? (height * ampMultiplier * (0.2 + 0.8 * Math.sin(phase + i * 0.18))) 
            : 4;
          
          return (
            <rect
              key={i}
              x={i * barWidth}
              y={(height - barHeight) / 2}
              width={barWidth - 2.5}
              height={barHeight}
              fill={color}
              className="transition-all duration-75"
              rx={1.5}
            />
          );
        })}
      </g>
    </svg>
  );
};

// Typewriter Text Component
const TypewriterText: React.FC<{ text: string; delay?: number; onComplete?: () => void }> = ({ text, delay = 12, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay, onComplete]);

  return <span className="typewriter-cursor">{displayedText}</span>;
};

export default function App() {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');

  // Application States
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [crmLogs, setCrmLogs] = useState<CRMLog[]>(initialCrmLogs);
  const [objections, setObjections] = useState<Objection[]>(initialObjections);
  const [activities, setActivities] = useState<AgentActivity[]>(initialActivities);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('4821');

  // Lead-specific chats
  const [chats, setChats] = useState<Record<string, Message[]>>({
    '4821': initialChatTranscript,
  });

  // Leads search/filter
  const [leadsSearch, setLeadsSearch] = useState<string>('');
  const [leadsSort, setLeadsSort] = useState<'desc' | 'asc'>('desc');

  // RAG States
  const [selectedRagIndex, setSelectedRagIndex] = useState<number>(0);
  const [ragLoadingState, setRagLoadingState] = useState<'idle' | 'embedding' | 'retrieving' | 'generating' | 'done'>('idle');
  const [activeDocId, setActiveDocId] = useState<string>('doc1');

  // Voice Screen Call Simulator
  const [voiceCallActive, setVoiceCallActive] = useState<boolean>(false);
  const [voiceCallStep, setVoiceCallStep] = useState<number>(0);
  const [voiceCaptions, setVoiceCaptions] = useState<string>('Voice system standby. Ready to initiate call.');

  // Demo Running State
  const [demoStatus, setDemoStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [demoStep, setDemoStep] = useState<number>(0);
  const [demoStatusText, setDemoStatusText] = useState<string>('');

  // Refs for auto-scroll
  const activityEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const crmEndRef = useRef<HTMLDivElement>(null);

  // Time & date display
  const [telemetryTime, setTelemetryTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTelemetryTime(d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll activity feed and chat logs
  useEffect(() => {
    if (activityEndRef.current) {
      activityEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activities]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, selectedLeadId]);

  useEffect(() => {
    if (crmEndRef.current) {
      crmEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [crmLogs]);

  // Orbit animation loop for drift effect
  useEffect(() => {
    const interval = setInterval(() => {
      setLeads(prevLeads => {
        return prevLeads.map(lead => {
          // Slow drift along the angle
          const angleDrift = lead.status === 'Hot' ? 0.04 : 0.02;
          const newAngle = (lead.angle + angleDrift) % 360;

          // Smooth radius interpolation
          const radDiff = lead.targetRadius - lead.currentRadius;
          const newRadius = Math.abs(radDiff) < 0.5 
            ? lead.targetRadius 
            : lead.currentRadius + radDiff * 0.05;

          return {
            ...lead,
            angle: newAngle,
            currentRadius: newRadius
          };
        });
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Demo State Machine Script (Deterministic Playback)
  const startDemo = () => {
    // 1. Reset states to preparation mode
    setDemoStatus('running');
    setDemoStep(1);
    setDemoStatusText('Initializing Demo...');
    setActiveScreen('dashboard');

    // Create new Lead: Varun Garments (Cold)
    const newDemoLead: Lead = {
      id: '4829',
      name: 'Varun Grover',
      company: 'Varun Garments',
      email: 'varun@varungarments.in',
      phone: '+91 98765 43210',
      score: 12,
      status: 'Cold',
      source: 'Inbound Webform',
      nextFollowUp: 'Aug 14, 2026',
      angle: 270,
      targetRadius: 180, // Cold Ring
      currentRadius: 180
    };

    setLeads(prev => [...initialLeads.filter(l => l.id !== '4829'), newDemoLead]);
    setSelectedLeadId('4829');

    // Initialize clean transcripts, logs, and activity list
    setChats(prev => ({
      ...prev,
      '4829': []
    }));

    setActivities(prev => [
      {
        id: `demo-init-${Date.now()}`,
        text: 'SYSTEM NOTICE -> Demo Sequence Hook Triggered: New lead ingestion pipeline active.',
        timestamp: new Date().toLocaleTimeString(),
        type: 'info'
      },
      ...prev
    ]);

    setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
  };

  // Step changes timer
  useEffect(() => {
    if (demoStatus !== 'running') return;

    let timer: NodeJS.Timeout;

    // Helper to log activities
    const addActivity = (text: string, type: 'info' | 'success' | 'warning' | 'handoff', from?: string, to?: string) => {
      setActivities(prev => [
        ...prev,
        {
          id: `act-${Date.now()}`,
          text,
          timestamp: new Date().toLocaleTimeString(),
          type,
          fromAgent: from,
          toAgent: to
        }
      ]);
    };

    // Helper to append CRM logs
    const addCrm = (field: string, oldValue: string, newValue: string) => {
      setCrmLogs(prev => [
        ...prev,
        {
          id: `crm-${Date.now()}`,
          leadName: 'Varun Garments',
          field,
          oldValue,
          newValue,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    };

    // Helper to add chat messages
    const addChatMessage = (sender: 'customer' | 'ai', text: string, agentName?: string) => {
      setChats(prev => {
        const current = prev['4829'] || [];
        return {
          ...prev,
          '4829': [
            ...current,
            {
              id: `msg-${Date.now()}`,
              sender,
              text,
              timestamp: new Date().toLocaleTimeString(),
              agentName
            }
          ]
        };
      });
    };

    const runStep = (step: number) => {
      switch (step) {
        case 1:
          setDemoStatusText('Step 1: Lead Ingestion & Background Research');
          // Active Agent: Research
          setAgents(prev => prev.map(a => a.id === 'research' ? { ...a, status: 'working' } : { ...a, status: 'idle' }));
          addActivity('Research Agent -> enriqueciendo Varun Garments. Verificando GSTIN en Ludhiana Hub...', 'info', 'Research Agent');
          addCrm('Lead Status', '--', 'Cold');
          addCrm('Enrichment Info', '--', 'GSTIN: 03AAAAA1111A1Z1, Employee Size: 110, City: Ludhiana');
          break;

        case 2:
          setDemoStatusText('Step 2: Automated Qualification Scoring');
          // Active Agent: Qualification, Handoff: Research
          setAgents(prev => prev.map(a => {
            if (a.id === 'qualify') return { ...a, status: 'working' };
            if (a.id === 'research') return { ...a, status: 'handoff' };
            return { ...a, status: 'idle' };
          }));
          // Update Lead Score -> 48 (Warm)
          setLeads(prev => prev.map(l => l.id === '4829' ? { ...l, score: 48, status: 'Warm', targetRadius: 135 } : l));
          addActivity('Handoff: Research Agent -> Lead Qualification Agent', 'handoff', 'Research Agent', 'Lead Qualification Agent');
          addActivity('Qualification Agent -> BANT Match score calculated. High intent matched: score 48.', 'success', 'Qualification Agent');
          addCrm('Lead Score', '12', '48');
          addCrm('Lead Status', 'Cold', 'Warm');
          break;

        case 3:
          setDemoStatusText('Step 3: Initial Multi-Channel Outreach');
          // Active Agent: Comm, Handoff: Qualify
          setAgents(prev => prev.map(a => {
            if (a.id === 'comm') return { ...a, status: 'working' };
            if (a.id === 'qualify') return { ...a, status: 'handoff' };
            return { ...a, status: 'idle' };
          }));
          addActivity('Handoff: Qualification Agent -> Communication Agent', 'handoff', 'Lead Qualification Agent', 'Communication Agent');
          addActivity('Communication Agent -> Drafting tailored outreach message (Machinery Scheduling focus).', 'info', 'Communication Agent');
          
          addChatMessage('ai', 'Hi Varun! I noticed you are managing the operations at Varun Garments in Ludhiana. We help textiles automate their loom scheduling and cut down idle time by 18%. Are you currently scheduling loom runs manually, or do you have a software in place?', 'Communication Agent');
          addCrm('Outreach Channel', '--', 'WhatsApp / SMS');
          break;

        case 4:
          setDemoStatusText('Step 4: Customer Reply & Price Objection');
          // Active Agent: Objection, Handoff: Comm
          setAgents(prev => prev.map(a => {
            if (a.id === 'objection') return { ...a, status: 'working' };
            if (a.id === 'comm') return { ...a, status: 'handoff' };
            return { ...a, status: 'idle' };
          }));
          
          addChatMessage('customer', 'The features look interesting. But ₹35,000/month for the Growth plan is too high for our budget right now. We are a medium business, we cannot afford this setup cost.');
          addActivity('Objection Agent -> Detected price objection from Varun Grover (Varun Garments).', 'warning', 'Objection Agent');
          addCrm('Objection Type', '--', 'Price Budget Constraints');
          
          // Append to objection log list
          setObjections(prev => [
            {
              id: `obj-${Date.now()}`,
              leadName: 'Varun Grover',
              company: 'Varun Garments',
              message: 'The features look interesting. But ₹35,000/month for the Growth plan is too high for our budget.',
              type: 'price',
              strategy: 'Highlight Startup Ramp discount (20% off for 3 months) & outline loom capacity optimization savings.',
              response: 'I understand, Varun. We do offer a Startup Ramp program with 20% off for the first 3 months. Let\'s schedule a quick call to check if this fits.',
              timestamp: 'Just now'
            },
            ...prev
          ]);
          break;

        case 5:
          setDemoStatusText('Step 5: Objection Handling Response');
          // Active Agent: Comm, Handoff: Objection
          setAgents(prev => prev.map(a => {
            if (a.id === 'comm') return { ...a, status: 'working' };
            if (a.id === 'objection') return { ...a, status: 'handoff' };
            return { ...a, status: 'idle' };
          }));
          // Update Lead Score -> 74 (Qualified)
          setLeads(prev => prev.map(l => l.id === '4829' ? { ...l, score: 74, status: 'Qualified', targetRadius: 90 } : l));
          
          addActivity('Handoff: Objection Agent -> Communication Agent', 'handoff', 'Objection Agent', 'Communication Agent');
          addActivity('Communication Agent -> Sending pricing objection mitigation message.', 'info', 'Communication Agent');
          addChatMessage('ai', 'I completely understand the budget constraints, Varun. Loom scheduling overhead can be tight. To help you get started without stress, we have a Startup Ramp Program that gives you 20% off for the first 3 months (bringing it down to ₹28,000/month). Typically, optimizing just one loom capacity covers this price in 10 days. Would tomorrow at 3:00 PM IST work for a quick 10-minute demo call?', 'Communication Agent');
          addCrm('Lead Status', 'Warm', 'Qualified');
          break;

        case 6:
          setDemoStatusText('Step 6: Voice Agent Scheduling & Meeting Confirmation');
          // Active Agent: Schedule, Handoff: Comm
          setAgents(prev => prev.map(a => {
            if (a.id === 'schedule') return { ...a, status: 'working' };
            if (a.id === 'comm') return { ...a, status: 'handoff' };
            return { ...a, status: 'idle' };
          }));
          
          addChatMessage('customer', 'Yes, that discount helps. Tomorrow 3:00 PM works for me. Send the invitation details.');
          addActivity('Handoff: Communication Agent -> Scheduling Agent', 'handoff', 'Communication Agent', 'Scheduling Agent');
          addActivity('Scheduling Agent -> Checking calendar slots... Selected tomorrow at 15:00 IST.', 'info', 'Scheduling Agent');
          
          addChatMessage('ai', 'Perfect! I have scheduled our demo call for tomorrow, Aug 14, at 3:00 PM IST. A calendar invitation has been dispatched to varun@varungarments.in. Looking forward to our conversation.', 'Scheduling Agent');
          addCrm('Next Follow-up', 'Aug 14, 2026', 'Meeting Booked (Aug 14, 3:00 PM)');
          // Update Lead Score -> 95 (Hot)
          setLeads(prev => prev.map(l => l.id === '4829' ? { ...l, score: 95, status: 'Hot', targetRadius: 45 } : l));
          break;

        case 7:
          setDemoStatusText('Step 7: CRM Synchronization & Complete');
          // Active Agent: CRM, Handoff: Schedule
          setAgents(prev => prev.map(a => {
            if (a.id === 'crm') return { ...a, status: 'working' };
            if (a.id === 'schedule') return { ...a, status: 'handoff' };
            return { ...a, status: 'idle' };
          }));
          addActivity('Handoff: Scheduling Agent -> CRM Agent', 'handoff', 'Scheduling Agent', 'CRM Agent');
          addActivity('CRM Agent -> Bidirectional update complete. Push to Salesforce, HubSpot, Zoho succeeded in 320ms.', 'success', 'CRM Agent');
          addCrm('Lead Stage', 'Warm', 'Hot Deal / Opportunity Booked');
          
          timer = setTimeout(() => {
            // Finalize Agents
            setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })));
            addActivity('CRM Agent -> Tasks complete. Ingestion & automation loop finalized.', 'success', 'CRM Agent');
            setDemoStatus('completed');
            setDemoStatusText('Demo Complete: Conversion Pipeline Reached');
          }, 3500);
          break;
      }
    };

    runStep(demoStep);

    if (demoStep < 7) {
      timer = setTimeout(() => {
        setDemoStep(prev => prev + 1);
      }, 4200); // 4.2 seconds per stage
    }

    return () => clearTimeout(timer);
  }, [demoStatus, demoStep]);

  // Voice call simulator timeline
  useEffect(() => {
    if (!voiceCallActive) return;
    let timer: NodeJS.Timeout;

    const runCallStep = (step: number) => {
      switch (step) {
        case 1:
          setVoiceCaptions('Nova AI: "Hello Aravind Swamy, this is Nova calling on behalf of Kavya Textiles inquiries. We noticed your interest in our Tamil multi-lingual sales..."');
          setVoiceCallStep(1);
          timer = setTimeout(() => runCallStep(2), 4000);
          break;
        case 2:
          setVoiceCaptions('Aravind Swamy: "Wait, sorry to interrupt. Can you tell me if the AI integrations work with our custom billing database, or is it only Salesforce?"');
          setVoiceCallStep(2); // In step 2, customer is speaking, AI waveform drops
          timer = setTimeout(() => runCallStep(3), 4000);
          break;
        case 3:
          setVoiceCaptions('[SYSTEM: Interruption detected. Discarding output queue. Speech-to-Text enqueued... Processing database query...]');
          setVoiceCallStep(3); // AI is processing
          timer = setTimeout(() => runCallStep(4), 2500);
          break;
        case 4:
          setVoiceCaptions('Nova AI: "Ah, good question Aravind. Yes, Nova features a RAG-connected database sync. We support standard Salesforce, Zoho, and also custom SQL databases through webhooks. It updates within 500ms..."');
          setVoiceCallStep(4); // AI responding again
          timer = setTimeout(() => {
            setVoiceCallActive(false);
            setVoiceCallStep(0);
            setVoiceCaptions('Call completed. Connection closed.');
          }, 6000);
          break;
      }
    };

    runCallStep(1);
    return () => clearTimeout(timer);
  }, [voiceCallActive]);

  // RAG simulation trigger
  const runRagTrace = () => {
    setRagLoadingState('embedding');
    setTimeout(() => {
      setRagLoadingState('retrieving');
      setTimeout(() => {
        setRagLoadingState('generating');
        setTimeout(() => {
          setRagLoadingState('done');
        }, 1500);
      }, 1200);
    }, 1200);
  };

  // Helper variables for styling Active Screen selection
  const navItems = [
    { id: 'dashboard', label: 'Mission Control', icon: Cpu },
    { id: 'leads', label: 'Leads Orbit', icon: Users },
    { id: 'chat', label: 'AI Conversation', icon: MessageSquare },
    { id: 'voice', label: 'Voice Agent Call', icon: Phone },
    { id: 'rag', label: 'Knowledge (RAG)', icon: BookOpen },
    { id: 'objections', label: 'Objection Log', icon: AlertCircle },
    { id: 'schedule', label: 'Scheduling Calendar', icon: CalendarIcon },
    { id: 'crm', label: 'CRM Automation', icon: Database },
    { id: 'analytics', label: 'Funnel Analytics', icon: BarChart2 },
    { id: 'roster', label: 'Agent Team Roster', icon: Layers }
  ];

  return (
    <div className="min-h-screen bg-bg-void text-text-primary flex font-sans telemetry-grid telemetry-radial scanlines relative select-none">
      
      {/* Sidebar - Mission Control Navigation */}
      <aside className="w-72 bg-surface border-r border-signal-cyan/10 flex flex-col justify-between shrink-0 z-20">
        
        {/* Top Logo & Positioning */}
        <div className="p-6 border-b border-signal-cyan/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-signal-cyan rounded-full pulsing-cyan"></div>
            <h1 className="text-2xl font-display font-bold tracking-wider text-text-primary">
              NOVA <span className="text-signal-cyan font-light text-sm">v1.0</span>
            </h1>
          </div>
          <p className="text-xs text-text-muted font-mono uppercase tracking-widest leading-relaxed">
            SALES WORKFORCE ORBIT
          </p>
        </div>

        {/* Screen Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveScreen(item.id);
                  if (item.id === 'chat' && demoStatus === 'running') {
                    setSelectedLeadId('4829'); // Force display the active demo lead
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left transition-all ${
                  isActive 
                    ? 'bg-surface-raised border-l-2 border-signal-cyan text-signal-cyan' 
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-raised/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-signal-cyan' : 'text-text-muted'}`} />
                  <span className="text-sm font-display tracking-wide">{item.label}</span>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-signal-cyan"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Telemetry Status Box */}
        <div className="p-5 border-t border-signal-cyan/10 bg-bg-void/60 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">SYSTEM STATUS:</span>
            <span className="text-signal-cyan font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-cyan animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">VOICE LATENCY:</span>
            <span className="text-text-primary">680 ms</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">ROSTER STATUS:</span>
            <span className="text-signal-cyan">10/10 ACTIVE</span>
          </div>
          <div className="pt-2 border-t border-signal-cyan/10 text-center text-text-muted select-text">
            {telemetryTime || '2026-08-13 06:49:54 UTC'}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 z-10">
        
        {/* Global Action Header */}
        <header className="h-16 border-b border-signal-cyan/10 bg-surface/50 backdrop-blur px-8 flex items-center justify-between shrink-0">
          
          {/* Headline/Positioning line */}
          <div className="max-w-2xl hidden lg:block">
            <p className="text-xs text-text-muted italic leading-snug">
              "Nova is an autonomous multi-agent AI sales workforce for end-to-end lead-to-conversion automation."
            </p>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Demo Status Banner */}
            {demoStatus === 'running' && (
              <div className="flex items-center gap-2 bg-surface-raised border border-flare-amber/30 px-3 py-1 rounded">
                <span className="w-2 h-2 rounded-full bg-flare-amber pulsing-amber"></span>
                <span className="text-xs font-mono text-flare-amber tracking-wider">
                  {demoStatusText}
                </span>
              </div>
            )}

            {/* Run Demo CTA */}
            <button
              onClick={startDemo}
              disabled={demoStatus === 'running'}
              className={`px-4 py-1.5 rounded font-display text-sm font-semibold tracking-wide flex items-center gap-2 transition-all ${
                demoStatus === 'running'
                  ? 'bg-surface border border-signal-cyan/20 text-signal-cyan cursor-not-allowed'
                  : 'bg-flare-amber hover:bg-flare-amber/90 text-bg-void shadow-lg shadow-flare-amber/20 pulsing-amber cursor-pointer'
              }`}
            >
              <Play className="w-4 h-4" fill="currentColor" />
              {demoStatus === 'running' ? `DEMO STEP ${demoStep}/7` : 'RUN STAGE DEMO'}
            </button>

            {demoStatus === 'completed' && (
              <button 
                onClick={() => { setDemoStatus('idle'); setLeads(initialLeads); setActivities(initialActivities); setCrmLogs(initialCrmLogs); setObjections(initialObjections); }}
                className="text-xs text-signal-cyan font-mono hover:underline uppercase"
              >
                Reset Demo
              </button>
            )}
          </div>
        </header>

        {/* Central Dashboard Layout */}
        <div className="flex-1 p-8 overflow-y-auto min-w-0">
          
          {/* SCREEN 1: Dashboard (Mission Control) */}
          {activeScreen === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Telemetry Stats Strip */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'TOTAL LEADS', value: leads.length, unit: 'PROSPECTS' },
                  { label: 'QUALIFIED LEADS', value: leads.filter(l => l.score >= 50).length, unit: 'WARM/HOT' },
                  { label: 'HOT LEADS', value: leads.filter(l => l.status === 'Hot').length, unit: 'ORBIT CORE' },
                  { label: 'CONVERSION RATE', value: demoStatus === 'completed' ? '30.1%' : '24.2%', unit: 'MEETING RATIO' },
                  { label: 'MEETINGS BOOKED', value: demoStatus === 'completed' ? '3' : '2', unit: 'CALENDAR SYNC' }
                ].map((stat, i) => (
                  <div key={i} className="bg-surface border border-signal-cyan/10 p-4 rounded text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-signal-cyan/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="text-[10px] text-text-muted font-mono tracking-widest uppercase mb-1">{stat.label}</div>
                    <div className="text-3xl font-mono font-bold text-signal-cyan">{stat.value}</div>
                    <div className="text-[9px] text-text-muted font-mono tracking-wider mt-1">{stat.unit}</div>
                  </div>
                ))}
              </div>

              {/* Main Mission Control Grid */}
              <div className="grid grid-cols-12 gap-6">
                
                {/* Orbit map (Signature element) */}
                <div className="col-span-12 xl:col-span-7 bg-surface border border-signal-cyan/15 p-6 rounded flex flex-col items-center justify-center relative min-h-[500px]">
                  
                  {/* Orbit Title & Legend */}
                  <div className="w-full flex justify-between items-center mb-4 absolute top-6 left-6 right-6 px-6">
                    <div>
                      <h2 className="text-md font-display font-semibold tracking-wide text-text-primary">
                        AGENT ORCHESTRATION ORBIT
                      </h2>
                      <p className="text-xs text-text-muted font-mono uppercase tracking-widest mt-0.5">
                        REAL-TIME LEAD PIPELINE TELEMETRY
                      </p>
                    </div>
                    
                    {/* Ring legend */}
                    <div className="flex gap-4 text-[10px] font-mono text-text-muted">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-text-muted/40"></span>COLD</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-signal-cyan/35"></span>WARM</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-signal-cyan/65"></span>QUALIFIED</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-flare-amber/80"></span>HOT</span>
                    </div>
                  </div>

                  {/* SVG Orbit Visualizer */}
                  <div className="relative w-full max-w-[480px] aspect-square flex items-center justify-center select-none pt-6">
                    <svg viewBox="0 0 500 500" className="w-full h-full overflow-visible">
                      
                      {/* Concentric rings */}
                      <circle cx="250" cy="250" r="180" fill="none" stroke="rgba(139, 147, 167, 0.12)" strokeWidth="1" strokeDasharray="3 3" />
                      <circle cx="250" cy="250" r="135" fill="none" stroke="rgba(76, 231, 208, 0.15)" strokeWidth="1" />
                      <circle cx="250" cy="250" r="90" fill="none" stroke="rgba(76, 231, 208, 0.25)" strokeWidth="1" />
                      <circle cx="250" cy="250" r="45" fill="none" stroke="rgba(255, 166, 48, 0.3)" strokeWidth="1" />
                      
                      {/* Central core (Conversion) */}
                      <circle cx="250" cy="250" r="10" fill="#4CE7D0" className="opacity-80 blur-[2px] cursor-pointer" />
                      <circle cx="250" cy="250" r="4" fill="#F4F3EF" />

                      {/* Lead dots with CSS transition coordinates */}
                      {leads.map(lead => {
                        const x = 250 + lead.currentRadius * Math.cos((lead.angle * Math.PI) / 180);
                        const y = 250 + lead.currentRadius * Math.sin((lead.angle * Math.PI) / 180);
                        const isDemoLead = lead.id === '4829';
                        const dotColor = lead.status === 'Hot' ? '#FFA630' : '#4CE7D0';

                        return (
                          <g key={lead.id} className="cursor-pointer" onClick={() => { setSelectedLeadId(lead.id); setActiveScreen('chat'); }}>
                            <circle 
                              cx={x} 
                              cy={y} 
                              r={isDemoLead ? 8 : 6} 
                              fill={dotColor} 
                              className={isDemoLead ? "animate-pulse" : "opacity-80"} 
                              style={{ transition: 'cx 0.8s ease-out, cy 0.8s ease-out' }}
                            />
                            {isDemoLead && (
                              <circle 
                                cx={x} 
                                cy={y} 
                                r="12" 
                                fill="none" 
                                stroke="#FFA630" 
                                strokeWidth="1" 
                                className="animate-ping" 
                                style={{ transition: 'cx 0.8s ease-out, cy 0.8s ease-out' }}
                              />
                            )}
                            <text 
                              x={x} 
                              y={y - 10} 
                              fill={isDemoLead ? "#FFA630" : "#F4F3EF"} 
                              fontSize="8" 
                              fontFamily="var(--font-mono)" 
                              fontWeight={isDemoLead ? "bold" : "normal"}
                              textAnchor="middle"
                              className="opacity-75"
                              style={{ transition: 'x 0.8s ease-out, y 0.8s ease-out' }}
                            >
                              {lead.company} {isDemoLead ? `(${lead.score}%)` : ''}
                            </text>
                          </g>
                        );
                      })}

                      {/* Fixed Agent nodes around the perimeter */}
                      {agents.map((agent, i) => {
                        const theta = (agent.angle * Math.PI) / 180;
                        const ax = 250 + 225 * Math.cos(theta);
                        const ay = 250 + 225 * Math.sin(theta);
                        
                        const isWorking = agent.status === 'working';
                        const isHandoff = agent.status === 'handoff';
                        
                        // Text alignment logic to keep labels looking clean
                        const textRight = Math.cos(theta) >= 0;
                        const textAnchor = textRight ? 'start' : 'end';
                        const textX = ax + (textRight ? 14 : -14);
                        
                        return (
                          <g key={agent.id}>
                            {/* Pulse rings for active states */}
                            {isWorking && (
                              <circle cx={ax} cy={ay} r="18" fill="none" stroke="#4CE7D0" strokeWidth="1.5" className="animate-ping opacity-60" />
                            )}
                            {isHandoff && (
                              <circle cx={ax} cy={ay} r="18" fill="none" stroke="#FFA630" strokeWidth="1.5" className="animate-ping opacity-60" />
                            )}

                            {/* Base Node Circle */}
                            <circle 
                              cx={ax} 
                              cy={ay} 
                              r="8" 
                              fill={isWorking ? '#4CE7D0' : isHandoff ? '#FFA630' : '#131A2E'} 
                              stroke={isWorking || isHandoff ? 'none' : 'rgba(76, 231, 208, 0.4)'} 
                              strokeWidth="1" 
                            />
                            <circle cx={ax} cy={ay} r="3" fill="#0A0E1A" />

                            {/* Node Label */}
                            <text 
                              x={textX} 
                              y={ay + 3} 
                              fill={isWorking ? '#4CE7D0' : isHandoff ? '#FFA630' : '#8B93A7'} 
                              fontSize="9" 
                              fontFamily="var(--font-display)" 
                              fontWeight={isWorking || isHandoff ? 'bold' : 'normal'}
                              textAnchor={textAnchor}
                            >
                              {agent.name}
                            </text>
                          </g>
                        );
                      })}

                      {/* Active Connection Line & Flow Trails */}
                      {demoStatus === 'running' && (() => {
                        const activeAgent = agents.find(a => a.status === 'working');
                        const handoffAgent = agents.find(a => a.status === 'handoff');
                        const activeLead = leads.find(l => l.id === '4829');

                        if (!activeLead) return null;

                        const lx = 250 + activeLead.currentRadius * Math.cos((activeLead.angle * Math.PI) / 180);
                        const ly = 250 + activeLead.currentRadius * Math.sin((activeLead.angle * Math.PI) / 180);

                        return (
                          <>
                            {/* Draw active worker line to lead */}
                            {activeAgent && (() => {
                              const theta = (activeAgent.angle * Math.PI) / 180;
                              const ax = 250 + 225 * Math.cos(theta);
                              const ay = 250 + 225 * Math.sin(theta);
                              return (
                                <line 
                                  x1={ax} y1={ay} x2={lx} y2={ly} 
                                  stroke="#4CE7D0" 
                                  strokeWidth="1.5" 
                                  strokeDasharray="5 3" 
                                  className="laser-line" 
                                  opacity="0.75" 
                                />
                              );
                            })()}

                            {/* Draw handoff line between agents */}
                            {handoffAgent && activeAgent && (() => {
                              const hTheta = (handoffAgent.angle * Math.PI) / 180;
                              const hx = 250 + 225 * Math.cos(hTheta);
                              const hy = 250 + 225 * Math.sin(hTheta);

                              const aTheta = (activeAgent.angle * Math.PI) / 180;
                              const ax = 250 + 225 * Math.cos(aTheta);
                              const ay = 250 + 225 * Math.sin(aTheta);

                              return (
                                <path 
                                  d={`M ${hx} ${hy} Q 250 250 ${ax} ${ay}`} 
                                  fill="none" 
                                  stroke="#FFA630" 
                                  strokeWidth="1.5" 
                                  strokeDasharray="6 4" 
                                  className="laser-line" 
                                  opacity="0.8" 
                                />
                              );
                            })()}
                          </>
                        );
                      })()}

                    </svg>
                  </div>
                </div>

                {/* Right Side - Agent Activity Log Terminal */}
                <div className="col-span-12 xl:col-span-5 bg-surface border border-signal-cyan/15 rounded flex flex-col h-[500px]">
                  
                  {/* Console Header */}
                  <div className="px-5 py-4 border-b border-signal-cyan/10 bg-bg-void/40 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-signal-cyan animate-pulse"></div>
                      <span className="text-sm font-display font-semibold tracking-wide">
                        AGENT ORCHESTRATOR LOG
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                      STREAMING REALTIME
                    </span>
                  </div>

                  {/* Terminal Box */}
                  <div className="flex-1 p-5 overflow-y-auto font-mono text-xs space-y-3.5 bg-bg-void/10 select-text">
                    {activities.map((act) => {
                      let tagColor = 'text-signal-cyan';
                      let label = '[INFO]';
                      
                      if (act.type === 'success') {
                        tagColor = 'text-green-400';
                        label = '[OK]';
                      } else if (act.type === 'warning') {
                        tagColor = 'text-flare-amber';
                        label = '[WARN]';
                      } else if (act.type === 'handoff') {
                        tagColor = 'text-pink-400';
                        label = '[FLOW]';
                      }

                      return (
                        <div key={act.id} className="leading-relaxed border-b border-signal-cyan/5 pb-2">
                          <div className="flex justify-between items-center text-[10px] text-text-muted mb-1 font-mono">
                            <span>{act.timestamp}</span>
                            {act.fromAgent && (
                              <span className="text-signal-cyan/70 font-semibold">{act.fromAgent}</span>
                            )}
                          </div>
                          <div className="text-text-primary">
                            <span className={`${tagColor} font-bold mr-2`}>{label}</span>
                            {act.text}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={activityEndRef} />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SCREEN 2: Leads Orbit List */}
          {activeScreen === 'leads' && (
            <div className="bg-surface border border-signal-cyan/15 rounded p-6">
              
              {/* Filter / Search header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-display font-semibold text-text-primary">LEADS DIRECTORY</h2>
                  <p className="text-xs text-text-muted font-mono uppercase tracking-widest">ACTIVE OPPORTUNITIES IN PIPELINE</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter leads/company..."
                      value={leadsSearch}
                      onChange={(e) => setLeadsSearch(e.target.value)}
                      className="bg-bg-void border border-signal-cyan/10 rounded px-3 py-1.5 pl-9 text-sm text-text-primary focus:outline-none focus:border-signal-cyan/50 placeholder-text-muted"
                    />
                  </div>

                  {/* Sort by Score */}
                  <button
                    onClick={() => setLeadsSort(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="bg-bg-void border border-signal-cyan/10 rounded px-3 py-1.5 text-xs font-mono text-text-primary hover:border-signal-cyan/40 flex items-center gap-1.5"
                  >
                    SCORE: {leadsSort.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse select-text">
                  <thead>
                    <tr className="border-b border-signal-cyan/10 font-mono text-xs text-text-muted uppercase tracking-widest">
                      <th className="py-3 px-4 font-normal">Lead ID</th>
                      <th className="py-3 px-4 font-normal">Contact / Company</th>
                      <th className="py-3 px-4 font-normal text-center">Score</th>
                      <th className="py-3 px-4 font-normal">Pipeline Status</th>
                      <th className="py-3 px-4 font-normal">Source</th>
                      <th className="py-3 px-4 font-normal">Next Event</th>
                      <th className="py-3 px-4 font-normal text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-signal-cyan/5">
                    {leads
                      .filter(l => {
                        const s = leadsSearch.toLowerCase();
                        return l.name.toLowerCase().includes(s) || l.company.toLowerCase().includes(s);
                      })
                      .sort((a, b) => leadsSort === 'desc' ? b.score - a.score : a.score - b.score)
                      .map((lead) => {
                        const isDemoLead = lead.id === '4829';
                        return (
                          <tr 
                            key={lead.id} 
                            onClick={() => { setSelectedLeadId(lead.id); setActiveScreen('chat'); }}
                            className={`hover:bg-surface-raised/40 transition-colors cursor-pointer ${isDemoLead ? 'bg-flare-amber/5' : ''}`}
                          >
                            <td className="py-3.5 px-4 font-mono font-semibold text-signal-cyan">#{lead.id}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-text-primary">{lead.name}</div>
                              <div className="text-xs text-text-muted">{lead.company}</div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-mono font-bold text-signal-cyan text-xs">{lead.score}%</span>
                                <div className="w-16 bg-bg-void h-1 rounded overflow-hidden mt-1 border border-signal-cyan/10">
                                  <div className="bg-signal-cyan h-full rounded" style={{ width: `${lead.score}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                lead.status === 'Hot' ? 'bg-flare-amber/20 text-flare-amber border border-flare-amber/35 pulsing-amber' :
                                lead.status === 'Qualified' ? 'bg-signal-cyan/20 text-signal-cyan border border-signal-cyan/35' :
                                lead.status === 'Warm' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' :
                                'bg-gray-500/10 text-text-muted border border-text-muted/20'
                              }`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-text-muted font-mono">{lead.source}</td>
                            <td className="py-3.5 px-4 text-xs font-mono">{lead.nextFollowUp}</td>
                            <td className="py-3.5 px-4 text-right">
                              <button className="text-signal-cyan hover:text-text-primary text-xs font-mono flex items-center gap-0.5 ml-auto">
                                INSPECT <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SCREEN 3: Lead Detail / Conversation View */}
          {activeScreen === 'chat' && (() => {
            const currentLead = leads.find(l => l.id === selectedLeadId) || leads[0];
            const chatMessages = chats[currentLead.id] || [];

            // Mock reasoning template based on score/status
            const needText = currentLead.status === 'Hot' ? 'Automate sales booking + database integration' :
                             currentLead.status === 'Qualified' ? 'Pricing discount verification & custom SQL' :
                             currentLead.status === 'Warm' ? 'General pricing request and WhatsApp support' : 'Cold Enrichment';
            
            const isBantBudget = currentLead.status === 'Qualified' || currentLead.status === 'Hot';
            const isBantAuthority = currentLead.score > 30;
            const isBantNeed = currentLead.score > 15;
            const isBantTimeline = currentLead.score > 40;

            const isObjection = currentLead.id === '4829' && demoStep >= 4;

            return (
              <div className="space-y-6">
                
                {/* Lead Profile Strip */}
                <div className="bg-surface border border-signal-cyan/15 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-bg-void border border-signal-cyan/20 rounded flex items-center justify-center font-mono text-lg font-bold text-signal-cyan">
                      #{currentLead.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-display font-semibold text-text-primary">{currentLead.name}</h2>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          currentLead.status === 'Hot' ? 'border-flare-amber/40 bg-flare-amber/10 text-flare-amber' : 'border-signal-cyan/20 bg-signal-cyan/10 text-signal-cyan'
                        }`}>
                          {currentLead.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted font-mono">{currentLead.company} | {currentLead.email} | {currentLead.phone}</p>
                    </div>
                  </div>

                  <div className="flex gap-6 text-left border-t md:border-t-0 md:border-l border-signal-cyan/10 pt-3 md:pt-0 md:pl-6 font-mono text-xs">
                    <div>
                      <div className="text-text-muted text-[10px] uppercase">LEAD SCORE</div>
                      <div className="text-lg font-bold text-signal-cyan">{currentLead.score}%</div>
                    </div>
                    <div>
                      <div className="text-text-muted text-[10px] uppercase">SOURCE</div>
                      <div className="text-lg font-bold text-text-primary">{currentLead.source}</div>
                    </div>
                    <div>
                      <div className="text-text-muted text-[10px] uppercase">NEXT EVENT</div>
                      <div className="text-lg font-bold text-flare-amber">{currentLead.nextFollowUp}</div>
                    </div>
                  </div>
                </div>

                {/* Split Panel */}
                <div className="grid grid-cols-12 gap-6">
                  
                  {/* Left Column: Chat panel */}
                  <div className="col-span-12 xl:col-span-7 bg-surface border border-signal-cyan/15 rounded flex flex-col h-[520px]">
                    <div className="px-5 py-3 border-b border-signal-cyan/10 bg-bg-void/40 flex items-center justify-between shrink-0">
                      <span className="text-xs font-mono uppercase tracking-widest text-text-muted">CHANNELS: WHATSAPP / EMAIL CONVERSATION</span>
                      <span className="w-2 h-2 rounded-full bg-signal-cyan animate-pulse"></span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 select-text">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-text-muted font-mono text-xs italic">
                          No conversation transcript initialized. Trigger demo sequence to begin.
                        </div>
                      ) : (
                        chatMessages.map((msg, index) => {
                          const isAI = msg.sender === 'ai';
                          const isLastMessage = index === chatMessages.length - 1;

                          return (
                            <div key={msg.id} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[80%] p-4 rounded text-xs leading-relaxed ${
                                isAI 
                                  ? 'bg-surface-raised border border-signal-cyan/15 text-text-primary' 
                                  : 'bg-bg-void border border-signal-cyan/5 text-text-primary'
                              }`}>
                                <div className="flex justify-between items-center text-[10px] text-text-muted mb-2 font-mono">
                                  <span className="font-bold text-signal-cyan">{isAI ? (msg.agentName || 'Agent') : 'Customer'}</span>
                                  <span>{msg.timestamp}</span>
                                </div>
                                {isAI && isLastMessage && (demoStep === 3 || demoStep === 5 || demoStep === 6) ? (
                                  <TypewriterText text={msg.text} />
                                ) : (
                                  <p>{msg.text}</p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Placeholder */}
                    <div className="p-3.5 border-t border-signal-cyan/10 bg-bg-void/30 flex gap-2 shrink-0">
                      <input 
                        type="text" 
                        disabled 
                        placeholder="Autonomous mode active. Manual inputs bypassed on competition demo." 
                        className="flex-1 bg-bg-void/50 border border-signal-cyan/5 text-xs text-text-muted rounded px-3 py-2 focus:outline-none"
                      />
                      <button disabled className="bg-signal-cyan/10 border border-signal-cyan/20 text-signal-cyan p-2 rounded cursor-not-allowed">
                        <Send className="w-4 h-4 opacity-50" />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: AI Reasoning Telemetry */}
                  <div className="col-span-12 xl:col-span-5 bg-surface border border-signal-cyan/15 rounded p-5 flex flex-col h-[520px] justify-between">
                    
                    {/* Top BANT Checkboxes */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-3">AI COGNITIVE EXTRACTOR (BANT)</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'BUDGET FIT', value: isBantBudget, details: isBantBudget ? 'Startup Ramp acceptable' : 'Flagged price doubt' },
                            { label: 'AUTHORITY FIT', value: isBantAuthority, details: isBantAuthority ? 'Owner/Partner Verified' : 'Checking LinkedIn' },
                            { label: 'NEED MATCHED', value: isBantNeed, details: isBantNeed ? 'Loom capacity bottleneck' : 'Assimilating data' },
                            { label: 'TIMELINE ALIGNED', value: isBantTimeline, details: isBantTimeline ? 'Within 30 days' : 'Assigned low score' }
                          ].map((item, idx) => (
                            <div key={idx} className="bg-bg-void border border-signal-cyan/5 p-3 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center border ${
                                  item.value ? 'bg-signal-cyan/20 border-signal-cyan' : 'border-text-muted/30'
                                }`}>
                                  {item.value && <Check className="w-3 h-3 text-signal-cyan" />}
                                </div>
                                <span className="text-[10px] font-mono font-bold text-text-primary">{item.label}</span>
                              </div>
                              <span className="text-[10px] text-text-muted font-mono">{item.details}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Need & Sentiment Extracted */}
                      <div className="bg-bg-void border border-signal-cyan/5 p-4 rounded space-y-3 font-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-muted text-[10px]">DETECTED BUSINESS NEED:</span>
                          <span className="text-signal-cyan font-bold uppercase text-[10px]">{needText}</span>
                        </div>
                        
                        {/* Sentiment Meter */}
                        <div>
                          <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
                            <span>CUSTOMER SENTIMENT:</span>
                            <span className={
                              currentLead.status === 'Hot' ? 'text-green-400 font-bold' :
                              currentLead.status === 'Warm' ? 'text-yellow-400 font-bold' :
                              'text-text-muted'
                            }>
                              {currentLead.status === 'Hot' ? 'POSITIVE' : currentLead.status === 'Warm' ? 'NEUTRAL' : 'COLD'}
                            </span>
                          </div>
                          
                          <div className="h-2 bg-surface-raised rounded-full relative overflow-hidden border border-signal-cyan/10">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                currentLead.status === 'Hot' ? 'bg-green-400' :
                                currentLead.status === 'Warm' ? 'bg-yellow-400' :
                                'bg-text-muted'
                              }`}
                              style={{ width: `${currentLead.score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Objection Handling Agent Strategy (Glows Amber if objection is active) */}
                    <div className={`p-4 rounded border transition-all duration-300 ${
                      isObjection 
                        ? 'bg-flare-amber/10 border-flare-amber/40 shadow-lg shadow-flare-amber/5' 
                        : 'bg-bg-void/40 border-signal-cyan/10 text-text-muted'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`w-4 h-4 ${isObjection ? 'text-flare-amber' : 'text-text-muted'}`} />
                        <h4 className="text-xs font-mono font-bold tracking-wide text-text-primary">
                          OBJECTION RESOLUTION TELEMETRY
                        </h4>
                      </div>
                      
                      {isObjection ? (
                        <div className="space-y-2 text-xs font-mono select-text">
                          <div className="text-flare-amber font-semibold">OBJECTION DETECTED: PRICE CONSTRAINT</div>
                          <div className="text-[11px] text-text-primary leading-relaxed">
                            <span className="text-text-muted font-bold block mb-0.5">STRATEGY OPTION SELECTED:</span>
                            Invoke Startup Ramp (20% off starter) & highlight saved overhead cost logic (ROI calculation).
                          </div>
                          <div className="text-[10px] text-text-muted border-t border-flare-amber/20 pt-1.5 mt-2">
                            OBJECTION CLASSIFICATION CONFIDENCE: 98%
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] font-mono">No active sales objections detected on this prospect timeline.</p>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            );
          })()}

          {/* SCREEN 4: Voice Agent Call Screen */}
          {activeScreen === 'voice' && (
            <div className="max-w-3xl mx-auto bg-surface border border-signal-cyan/15 rounded p-8 flex flex-col items-center justify-center min-h-[480px]">
              
              <div className="text-center mb-6">
                <h2 className="text-xl font-display font-semibold text-text-primary">NOVA AUDIO VOICE WORKFORCE</h2>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest mt-1">
                  LOW-LATENCY MULTI-LINGUAL VOICE REVOLUTION
                </p>
              </div>

              {/* Central Glowing Orb & Pulsing Waveforms */}
              <div className="w-full flex flex-col items-center gap-8 py-8">
                
                {/* Voice Call Avatar */}
                <div className="relative">
                  <div className={`w-28 h-28 bg-bg-void border-2 border-signal-cyan/40 rounded-full flex items-center justify-center transition-all ${
                    voiceCallActive ? 'shadow-2xl shadow-signal-cyan/20 border-signal-cyan animate-pulse' : ''
                  }`}>
                    <PhoneCall className={`w-10 h-10 ${voiceCallActive ? 'text-signal-cyan animate-bounce' : 'text-text-muted'}`} />
                  </div>
                  {voiceCallActive && (
                    <div className="absolute inset-0 border-2 border-signal-cyan rounded-full animate-ping opacity-30"></div>
                  )}
                </div>

                {/* Waveform Visualization Grid */}
                <div className="w-full max-w-lg space-y-6">
                  
                  {/* AI Output Stream */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1.5">
                      <span>NOVA VOICE GENERATOR (AI)</span>
                      <span className={voiceCallStep === 1 || voiceCallStep === 4 ? 'text-signal-cyan' : ''}>
                        {voiceCallStep === 1 || voiceCallStep === 4 ? 'SPEAKING' : 'MUTED / LISTENING'}
                      </span>
                    </div>
                    <div className="bg-bg-void/50 border border-signal-cyan/10 p-4 rounded flex items-center justify-center">
                      <Waveform active={voiceCallActive && (voiceCallStep === 1 || voiceCallStep === 4)} color="#4CE7D0" />
                    </div>
                  </div>

                  {/* Customer Input Stream */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-text-muted mb-1.5">
                      <span>CUSTOMER VOICE INCOMING (AMIT SHARMA)</span>
                      <span className={voiceCallStep === 2 ? 'text-flare-amber' : ''}>
                        {voiceCallStep === 2 ? 'SPEAKING (INTERRUPTING)' : 'SILENT'}
                      </span>
                    </div>
                    <div className="bg-bg-void/50 border border-signal-cyan/10 p-4 rounded flex items-center justify-center">
                      <Waveform active={voiceCallActive && voiceCallStep === 2} color="#FFA630" />
                    </div>
                  </div>

                </div>

              </div>

              {/* Call Captions Console */}
              <div className="w-full bg-bg-void border border-signal-cyan/10 rounded p-4 font-mono text-xs text-center select-text">
                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 border-b border-signal-cyan/5 pb-1">
                  LIVE TELEMETRY CAPTIONS ( Tamil-English Hybrid )
                </div>
                <div className="text-text-primary text-sm min-h-12 leading-relaxed">
                  {voiceCaptions}
                </div>
              </div>

              {/* Trigger Button */}
              <button
                onClick={() => {
                  setVoiceCallActive(true);
                  setVoiceCallStep(1);
                  setVoiceCaptions('Connecting voice channel to prospect...');
                }}
                disabled={voiceCallActive}
                className={`mt-6 px-5 py-2 rounded text-xs font-mono font-bold tracking-wider uppercase border transition-all ${
                  voiceCallActive 
                    ? 'border-signal-cyan/20 text-signal-cyan bg-signal-cyan/5 cursor-not-allowed'
                    : 'border-signal-cyan text-signal-cyan hover:bg-signal-cyan hover:text-bg-void cursor-pointer'
                }`}
              >
                {voiceCallActive ? 'Interactive Simulation Playing' : 'Simulate Interruption Scenario'}
              </button>

            </div>
          )}

          {/* SCREEN 5: Knowledge Base (RAG) */}
          {activeScreen === 'rag' && (
            <div className="grid grid-cols-12 gap-6">
              
              {/* Document List */}
              <div className="col-span-12 lg:col-span-5 space-y-4">
                <div className="bg-surface border border-signal-cyan/15 rounded p-5">
                  <h2 className="text-md font-display font-semibold text-text-primary mb-1">RAG KNOWLEDGE CORE</h2>
                  <p className="text-xs text-text-muted font-mono uppercase tracking-widest mb-4">VERIFIED KNOWLEDGE REPOSITORY</p>
                  
                  <div className="space-y-2">
                    {ragDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveDocId(doc.id)}
                        className={`w-full text-left p-3.5 rounded border transition-all select-text ${
                          activeDocId === doc.id
                            ? 'bg-surface-raised border-signal-cyan text-text-primary'
                            : 'bg-bg-void/40 border-signal-cyan/10 text-text-muted hover:border-signal-cyan/30'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold font-display text-text-primary">{doc.title}</span>
                          <span className="text-[9px] font-mono bg-signal-cyan/15 text-signal-cyan px-1.5 py-0.25 rounded">
                            {doc.category}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono line-clamp-2 leading-relaxed">{doc.content}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* RAG Query Tracing */}
              <div className="col-span-12 lg:col-span-7 bg-surface border border-signal-cyan/15 rounded p-5 flex flex-col justify-between h-full min-h-[500px]">
                <div>
                  <h2 className="text-md font-display font-semibold text-text-primary mb-1">REAL-TIME RETRIEVAL TRACE</h2>
                  <p className="text-xs text-text-muted font-mono uppercase tracking-widest mb-4">VECTOR SEARCH ANALYSIS</p>

                  {/* Pick Question dropdown */}
                  <div className="bg-bg-void border border-signal-cyan/10 p-4 rounded space-y-3 mb-4 select-text">
                    <label className="text-[10px] font-mono text-text-muted block">SELECT CUSTOMER QUESTION STIMULUS:</label>
                    <div className="flex gap-2">
                      <select 
                        value={selectedRagIndex}
                        onChange={(e) => {
                          setSelectedRagIndex(Number(e.target.value));
                          setRagLoadingState('idle');
                        }}
                        className="flex-1 bg-surface border border-signal-cyan/10 rounded px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none"
                      >
                        {ragSampleQueries.map((query, index) => (
                          <option key={index} value={index}>{query.query}</option>
                        ))}
                      </select>
                      <button 
                        onClick={runRagTrace}
                        className="bg-signal-cyan hover:bg-signal-cyan/95 text-bg-void px-4 py-1.5 rounded font-display text-xs font-bold flex items-center gap-1.5 shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                        TRACE RETRIEVAL
                      </button>
                    </div>
                  </div>

                  {/* Trace Outputs */}
                  <div className="space-y-3 font-mono text-xs select-text">
                    
                    {/* Embedding Step */}
                    {ragLoadingState !== 'idle' && (
                      <div className="bg-bg-void/40 border border-signal-cyan/5 p-3 rounded leading-relaxed">
                        <div className="flex items-center gap-2 text-[10px] text-text-muted mb-1">
                          <Cpu className="w-3.5 h-3.5 text-signal-cyan" />
                          <span>PHASE 1: QUERY VECTOR EMBEDDING</span>
                        </div>
                        {ragLoadingState === 'embedding' ? (
                          <div className="text-signal-cyan animate-pulse">Encoding query to 1536-dimensional float vector...</div>
                        ) : (
                          <div className="text-green-400">
                            [OK] Vector calculated. Readout: <span className="text-text-muted text-[10px]">[0.0817, -0.1983, 0.4491, 0.0031, -0.8712...]</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Retrieval Step */}
                    {(ragLoadingState === 'retrieving' || ragLoadingState === 'generating' || ragLoadingState === 'done') && (
                      <div className="bg-bg-void/40 border border-signal-cyan/5 p-3 rounded space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <Server className="w-3.5 h-3.5 text-signal-cyan" />
                          <span>PHASE 2: INDEX CHUNKS RETRIEVED</span>
                        </div>
                        {ragLoadingState === 'retrieving' ? (
                          <div className="text-signal-cyan animate-pulse">Querying vector index for cosine similarity threshold &gt; 0.70...</div>
                        ) : (
                          <div className="space-y-2">
                            {ragSampleQueries[selectedRagIndex].retrievedChunks.map((chunk, cIdx) => (
                              <div key={cIdx} className="border-l-2 border-signal-cyan pl-2 py-0.5">
                                <div className="flex justify-between text-[10px] text-text-muted">
                                  <span>{chunk.title}</span>
                                  <span className="text-signal-cyan font-bold">RELEVANCE: {chunk.score * 100}%</span>
                                </div>
                                <p className="text-[10.5px] text-text-primary leading-snug truncate mt-0.5">{chunk.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generation Step */}
                    {(ragLoadingState === 'generating' || ragLoadingState === 'done') && (
                      <div className="bg-bg-void/40 border border-signal-cyan/5 p-3 rounded leading-relaxed">
                        <div className="flex items-center gap-2 text-[10px] text-text-muted mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-flare-amber" />
                          <span>PHASE 3: GENERATIVE ANSWER MITIGATION</span>
                        </div>
                        {ragLoadingState === 'generating' ? (
                          <div className="text-signal-cyan animate-pulse">Running prompt context compilation... Synthesizing final answer.</div>
                        ) : (
                          <div className="text-text-primary text-[11px] leading-relaxed border-t border-signal-cyan/5 pt-2 mt-1 select-text">
                            <TypewriterText text={ragSampleQueries[selectedRagIndex].answer} delay={10} />
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>

                {ragLoadingState === 'idle' && (
                  <div className="text-center text-text-muted font-mono text-xs italic py-12">
                    Click "TRACE RETRIEVAL" to visualize the multi-stage vector search operations in real-time.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SCREEN 6: Objection Log */}
          {activeScreen === 'objections' && (
            <div className="bg-surface border border-signal-cyan/15 rounded p-6">
              
              <div className="mb-6">
                <h2 className="text-lg font-display font-semibold text-text-primary">OBJECTION AUDIT SYSTEM</h2>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest">REALTIME CAPTURED SALES OBJECTIONS & MITIGATION RESPONSES</p>
              </div>

              <div className="space-y-4 max-w-4xl select-text">
                {objections.map((obj) => (
                  <div key={obj.id} className="bg-bg-void border border-signal-cyan/10 p-5 rounded relative overflow-hidden">
                    
                    {/* Badge */}
                    <div className="absolute top-4 right-4 bg-flare-amber/15 text-flare-amber border border-flare-amber/35 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                      {obj.type}
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-flare-amber pulsing-amber"></div>
                      <span className="text-xs font-mono font-bold text-text-primary">{obj.leadName} ({obj.company})</span>
                      <span className="text-[10px] text-text-muted font-mono ml-2">{obj.timestamp}</span>
                    </div>

                    {/* Objection box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <div className="bg-surface p-3.5 rounded border border-signal-cyan/5">
                        <span className="text-[10px] text-text-muted font-mono block mb-1">PROSPECT PHRASE:</span>
                        <p className="text-xs italic text-text-primary font-mono select-text">"{obj.message}"</p>
                      </div>
                      
                      <div className="bg-surface p-3.5 rounded border border-signal-cyan/5">
                        <span className="text-[10px] text-text-muted font-mono block mb-1">NOVA RESOLUTION STRATEGY:</span>
                        <p className="text-xs text-signal-cyan font-mono select-text">{obj.strategy}</p>
                      </div>
                    </div>

                    {/* Final Response Draft */}
                    <div className="mt-4 pt-3.5 border-t border-signal-cyan/5">
                      <span className="text-[10px] text-text-muted font-mono block mb-1">DISPATCHED MITIGATION RESPONSE:</span>
                      <p className="text-xs text-text-primary leading-relaxed select-text">{obj.response}</p>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* SCREEN 7: Scheduling Calendar */}
          {activeScreen === 'schedule' && (() => {
            const hasDemoBooking = demoStep >= 6;
            
            return (
              <div className="bg-surface border border-signal-cyan/15 rounded p-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-display font-semibold text-text-primary">SCHEDULING COORDINATOR</h2>
                    <p className="text-xs text-text-muted font-mono uppercase tracking-widest">AI SUGGESTED CALENDAR RUNS</p>
                  </div>
                  
                  {hasDemoBooking && (
                    <div className="bg-green-500/10 border border-green-500/30 px-3.5 py-1.5 rounded flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-mono text-green-400">
                        Meeting with Varun Grover (Varun Garments) scheduled for Aug 14 at 15:00 IST.
                      </span>
                    </div>
                  )}
                </div>

                {/* Calendar Layout */}
                <div className="grid grid-cols-5 gap-3 text-center font-mono">
                  
                  {/* Calendar Days */}
                  {['MON (AUG 10)', 'TUE (AUG 11)', 'WED (AUG 12)', 'THU (AUG 13)', 'FRI (AUG 14)'].map((day, idx) => {
                    const isFriday = idx === 4;
                    
                    return (
                      <div key={idx} className="bg-bg-void border border-signal-cyan/10 p-3 rounded">
                        <div className="text-xs font-bold text-text-primary border-b border-signal-cyan/10 pb-2 mb-3">
                          {day}
                        </div>
                        
                        {/* Time slots */}
                        <div className="space-y-2 text-[10px]">
                          <div className="bg-surface/50 p-2 rounded border border-signal-cyan/5 text-text-muted">
                            10:00 - Available
                          </div>
                          
                          <div className="bg-surface/50 p-2 rounded border border-signal-cyan/5 text-text-muted">
                            11:30 - Available
                          </div>

                          {/* Suggested slot */}
                          <div className={`p-2 rounded border transition-all ${
                            isFriday && hasDemoBooking 
                              ? 'bg-flare-amber border-flare-amber text-bg-void font-bold shadow-lg shadow-flare-amber/20' 
                              : isFriday 
                                ? 'bg-signal-cyan/10 border-signal-cyan text-signal-cyan pulsing-cyan' 
                                : 'bg-surface/50 border border-signal-cyan/5 text-text-muted'
                          }`}>
                            {isFriday && hasDemoBooking ? '15:00 - BOOKED (VARUN GARMENTS)' : '15:00 - SUGGESTED SLOT'}
                          </div>

                          <div className="bg-surface-raised p-2 rounded border border-signal-cyan/10 text-text-primary">
                            16:30 - Core Sync (Internal)
                          </div>
                        </div>
                      </div>
                    );
                  })}

                </div>

              </div>
            );
          })()}

          {/* SCREEN 8: CRM Automation Log */}
          {activeScreen === 'crm' && (
            <div className="bg-surface border border-signal-cyan/15 rounded p-6 flex flex-col h-[520px]">
              
              <div className="mb-4 shrink-0">
                <h2 className="text-lg font-display font-semibold text-text-primary">CRM AUTOMATION RECORD</h2>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest">BIDIRECTIONAL DATABASE LOGS (DIFF STYLE)</p>
              </div>

              {/* CRM Terminal console */}
              <div className="flex-1 bg-bg-void/80 border border-signal-cyan/10 p-5 rounded overflow-y-auto font-mono text-xs select-text">
                <div className="text-[10px] text-text-muted border-b border-signal-cyan/10 pb-2 mb-3">
                  SYSTEM READY. TELEMETRY DIFF OUTPUT FROM SALESFORCE / ZOHO CRM ENDPOINTS:
                </div>
                
                <div className="space-y-2">
                  {crmLogs.map((log) => (
                    <div key={log.id} className="border-b border-signal-cyan/5 pb-2.5">
                      <div className="flex justify-between items-center text-[10px] text-text-muted mb-1.5">
                        <span className="font-bold text-signal-cyan">{log.leadName}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 leading-relaxed">
                        <div>
                          <span className="text-text-muted block text-[10px] uppercase font-bold">FIELD UPDATE:</span>
                          <span className="text-text-primary font-bold">{log.field}</span>
                        </div>
                        <div className="text-red-400 select-text">
                          <span className="text-text-muted block text-[10px] uppercase font-bold">REMOVED:</span>
                          - {log.oldValue || 'None'}
                        </div>
                        <div className="text-green-400 select-text">
                          <span className="text-text-muted block text-[10px] uppercase font-bold">ADDED:</span>
                          + {log.newValue}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={crmEndRef} />
                </div>
              </div>

            </div>
          )}

          {/* SCREEN 9: Funnel Analytics */}
          {activeScreen === 'analytics' && (
            <div className="space-y-6">
              
              {/* Custom Funnel Chart & Telemetry Charts */}
              <div className="grid grid-cols-12 gap-6">
                
                {/* Visual Pipeline Funnel */}
                <div className="col-span-12 xl:col-span-6 bg-surface border border-signal-cyan/15 rounded p-6 flex flex-col justify-between">
                  <div className="mb-4">
                    <h3 className="text-md font-display font-semibold text-text-primary">CONVERSION FLOW TELEMETRY</h3>
                    <p className="text-xs text-text-muted font-mono uppercase tracking-widest">LEADS TO CLOSED OPPORTUNITY FUNNEL</p>
                  </div>

                  {/* SVG custom funnel rendering */}
                  <div className="w-full flex items-center justify-center p-4">
                    <svg viewBox="0 0 400 240" className="w-full max-w-[340px] overflow-visible font-mono">
                      
                      {/* Define Gradients */}
                      <defs>
                        <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4CE7D0" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0A0E1A" stopOpacity="0.2" />
                        </linearGradient>
                      </defs>

                      {/* Funnel shape steps */}
                      {[
                        { label: 'Ingested', count: 180, width: 320, nextWidth: 240, y: 0, nextY: 40 },
                        { label: 'Contacted', count: 133, width: 240, nextWidth: 170, y: 40, nextY: 80 },
                        { label: 'Engaged', count: 94, width: 170, nextWidth: 110, y: 80, nextY: 120 },
                        { label: 'Qualified', count: 62, width: 110, nextWidth: 60, y: 120, nextY: 160 },
                        { label: 'Meetings Booked', count: 18, width: 60, nextWidth: 30, y: 160, nextY: 200 }
                      ].map((step, idx) => {
                        const x1 = (400 - step.width) / 2;
                        const x2 = (400 - step.nextWidth) / 2;
                        const x3 = 400 - x2;
                        const x4 = 400 - x1;

                        const pathD = `M ${x1} ${step.y} L ${x2} ${step.nextY} L ${x3} ${step.nextY} L ${x4} ${step.y} Z`;
                        
                        return (
                          <g key={idx} className="group cursor-pointer">
                            <path 
                              d={pathD} 
                              fill="url(#funnelGrad)" 
                              stroke="#4CE7D0" 
                              strokeWidth="1.5" 
                              className="opacity-70 group-hover:opacity-90 transition-opacity" 
                            />
                            
                            <text 
                              x="200" 
                              y={step.y + 24} 
                              fill="#F4F3EF" 
                              fontSize="10" 
                              fontWeight="bold"
                              textAnchor="middle"
                              className="pointer-events-none"
                            >
                              {step.label}: {step.count} ({Math.round(step.count / 180 * 100)}%)
                            </text>
                          </g>
                        );
                      })}

                    </svg>
                  </div>
                </div>

                {/* Conversion by Source & Score distribution */}
                <div className="col-span-12 xl:col-span-6 bg-surface border border-signal-cyan/15 rounded p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-md font-display font-semibold text-text-primary">ACQUISITION SOURCE DISTRIBUTION</h3>
                    <p className="text-xs text-text-muted font-mono uppercase tracking-widest mb-6">INBOUND VS OUTBOUND SOURCE METRICS</p>
                  </div>

                  {/* Horizontal Bar Chart */}
                  <div className="space-y-4 font-mono text-xs">
                    {[
                      { source: 'Inbound Webform', count: 42, percentage: 35 },
                      { source: 'LinkedIn Outreach', count: 32, percentage: 26 },
                      { source: 'Google Ads', count: 28, percentage: 23 },
                      { source: 'Direct Upload', count: 18, percentage: 15 }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5 select-text">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-text-primary font-bold">{item.source}</span>
                          <span className="text-signal-cyan font-bold">{item.count} leads ({item.percentage}%)</span>
                        </div>
                        <div className="h-2.5 bg-bg-void rounded-sm relative overflow-hidden border border-signal-cyan/10">
                          <div 
                            className="bg-signal-cyan h-full rounded-sm"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-signal-cyan/10 text-center text-[10px] font-mono text-text-muted">
                    Telemetry updated live from outbound data integrations.
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SCREEN 10: Agent Team Roster */}
          {activeScreen === 'roster' && (
            <div className="space-y-6">
              
              <div>
                <h2 className="text-lg font-display font-semibold text-text-primary">NOVA AGENT ROSTER</h2>
                <p className="text-xs text-text-muted font-mono uppercase tracking-widest">DEPLOYED SALES WORKFORCE STATUS</p>
              </div>

              {/* Grid of Agent Profile Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((agent) => {
                  const isActive = agent.status === 'working';
                  const isHandoff = agent.status === 'handoff';

                  return (
                    <div 
                      key={agent.id}
                      className={`p-5 rounded border transition-all ${
                        isActive 
                          ? 'bg-surface border-signal-cyan shadow-lg shadow-signal-cyan/5' 
                          : isHandoff 
                            ? 'bg-surface border-flare-amber shadow-lg shadow-flare-amber/5'
                            : 'bg-surface border-signal-cyan/10'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">NODE #{agent.id.toUpperCase()}</span>
                        
                        {/* Status Light */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-signal-cyan pulsing-cyan' : isHandoff ? 'bg-flare-amber pulsing-amber' : 'bg-green-500 opacity-60'
                          }`}></span>
                          <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider font-bold">
                            {isActive ? 'working' : isHandoff ? 'handoff' : 'idle'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-display font-semibold text-text-primary mb-1">{agent.name}</h3>
                      <p className="text-xs text-text-muted leading-relaxed font-sans">{agent.responsibility}</p>
                      
                      {/* Mini Metric */}
                      <div className="mt-4 pt-3 border-t border-signal-cyan/5 flex justify-between items-center text-[10px] font-mono text-text-muted">
                        <span>ORBIT ANGLE:</span>
                        <span className="text-signal-cyan font-bold">{agent.angle}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>
      </main>

    </div>
  );
}
