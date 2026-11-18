import type { Lead, Agent, Message, Objection, CRMLog, RAGDoc, RAGTrace, AgentActivity } from './types';

// Initial leads with specific positions on the orbit map
export const initialLeads: Lead[] = [
  {
    id: '4821',
    name: 'Aravind Swamy',
    company: 'Kavya Textiles',
    email: 'aravind@kavyatextiles.in',
    phone: '+91 94432 10984',
    score: 35,
    status: 'Warm',
    source: 'Inbound Webform',
    nextFollowUp: 'Aug 14, 2026',
    angle: 45,
    targetRadius: 110, // Warm ring
    currentRadius: 110,
  },
  {
    id: '4790',
    name: 'Rajesh Patel',
    company: 'Rajesh Motors',
    email: 'rajesh@rajeshmotors.co.in',
    phone: '+91 98250 87341',
    score: 68,
    status: 'Qualified',
    source: 'LinkedIn Outreach',
    nextFollowUp: 'Aug 15, 2026',
    angle: 120,
    targetRadius: 70, // Qualified ring
    currentRadius: 70,
  },
  {
    id: '4812',
    name: 'Nisha Rao',
    company: 'Bangalore TechCorp',
    email: 'nisha@bangaloretechcorp.com',
    phone: '+91 80234 56789',
    score: 92,
    status: 'Hot',
    source: 'Referral',
    nextFollowUp: 'Meeting Scheduled (Today)',
    angle: 210,
    targetRadius: 30, // Hot ring
    currentRadius: 30,
  },
  {
    id: '4801',
    name: 'Senthil Kumar',
    company: 'Chennai Agritech',
    email: 'senthil@chennaiagri.org',
    phone: '+91 44283 12345',
    score: 15,
    status: 'Cold',
    source: 'Directory Import',
    nextFollowUp: 'Aug 18, 2026',
    angle: 280,
    targetRadius: 150, // Cold ring
    currentRadius: 150,
  },
  {
    id: '4788',
    name: 'Amit Sharma',
    company: 'Delhi Solar Systems',
    email: 'amit@delhisolar.com',
    phone: '+91 99100 45678',
    score: 75,
    status: 'Qualified',
    source: 'Google Ads',
    nextFollowUp: 'Aug 16, 2026',
    angle: 330,
    targetRadius: 70, // Qualified ring
    currentRadius: 70,
  }
];

// 10 Specialized Agents
export const initialAgents: Agent[] = [
  { id: 'research', name: 'Research Agent', responsibility: 'Enriches lead profiles using public data', status: 'idle', angle: 0, iconName: 'Search' },
  { id: 'rag', name: 'Knowledge Agent', responsibility: 'Retrieves pricing, product, & security documentation', status: 'idle', angle: 36, iconName: 'BookOpen' },
  { id: 'qualify', name: 'Lead Qualification Agent', responsibility: 'Scores leads based on budget and timing fit', status: 'idle', angle: 72, iconName: 'ShieldAlert' },
  { id: 'comm', name: 'Communication Agent', responsibility: 'Orchestrates email and WhatsApp outreach threads', status: 'idle', angle: 108, iconName: 'Mail' },
  { id: 'voice', name: 'Voice Agent', responsibility: 'Conducts interactive call dialogues with interruptions', status: 'idle', angle: 144, iconName: 'PhoneCall' },
  { id: 'objection', name: 'Objection Agent', responsibility: 'Classifies and neutralizes pricing/competitor doubts', status: 'idle', angle: 180, iconName: 'AlertCircle' },
  { id: 'schedule', name: 'Scheduling Agent', responsibility: 'Manages calendars and issues calendar events', status: 'idle', angle: 216, iconName: 'Calendar' },
  { id: 'crm', name: 'CRM Agent', responsibility: 'Auto-updates pipeline, fields, and activity logs', status: 'idle', angle: 252, iconName: 'Database' },
  { id: 'followup', name: 'Follow-up Agent', responsibility: 'Tracks response delays and triggers reminders', status: 'idle', angle: 288, iconName: 'Clock' },
  { id: 'analytics', name: 'Analytics Agent', responsibility: 'Compiles conversions and pipeline insights', status: 'idle', angle: 324, iconName: 'BarChart2' }
];

// Document list for RAG screen
export const ragDocuments: RAGDoc[] = [
  {
    id: 'doc1',
    title: 'Nova Platform Pricing Sheet (v2.4)',
    content: 'Nova Starter Tier: ₹15,000/month up to 500 leads. Growth Tier: ₹35,000/month up to 2000 leads. Enterprise Tier: Custom pricing starting at ₹75,000/month with custom CRM syncing and dedicated Voice SLA. Startup Ramp Program: Provides a 20% discount on Starter/Growth plans for the first 3 months.',
    category: 'Pricing'
  },
  {
    id: 'doc2',
    title: 'Integrations & CRM Sync SLA',
    content: 'Nova supports bidirectional real-time syncing with Salesforce, HubSpot, Zoho, and Pipedrive. Updates are pushed via webhooks within 500ms of any state transition. Sync logs are stored for 30 days and comply with SOC-2 guidelines. No manual data entry is required.',
    category: 'Product'
  },
  {
    id: 'doc3',
    title: 'Voice Agent Capabilities & Latency',
    content: 'Nova Voice uses a low-latency streaming speech-to-text-to-speech engine. Average roundtrip latency is 680ms. The agent handles interruptions by dumping the current audio queue the moment incoming user voice exceeds -20dB amplitude, entering a processing state, and generating an adaptive contextual response.',
    category: 'Product'
  },
  {
    id: 'doc4',
    title: 'Data Security & Privacy Guidelines',
    content: 'All lead details and transcript data are encrypted in transit via TLS 1.3 and at rest using AES-256. We do not store raw recordings for longer than 7 days unless specified by the customer. Fully GDPR and DPDP Act (India) compliant.',
    category: 'Security'
  }
];

// Sample Queries for RAG trace testing
export const ragSampleQueries: RAGTrace[] = [
  {
    query: 'What is the startup discount and starter price?',
    retrievedChunks: [
      {
        title: 'Nova Platform Pricing Sheet (v2.4)',
        content: 'Nova Starter Tier: ₹15,000/month up to 500 leads... Startup Ramp Program: Provides a 20% discount on Starter/Growth plans for the first 3 months.',
        score: 0.94
      },
      {
        title: 'Data Security & Privacy Guidelines',
        content: 'All lead details and transcript data are encrypted... pricing starting at...',
        score: 0.28
      }
    ],
    answer: 'Nova offers a Starter Tier priced at ₹15,000/month for up to 500 leads. Additionally, the Startup Ramp Program provides a 20% discount on this starter tier (and Growth tier) for the first 3 months, bringing the price down to ₹12,000/month.'
  },
  {
    query: 'Does Nova sync with Zoho and Salesforce?',
    retrievedChunks: [
      {
        title: 'Integrations & CRM Sync SLA',
        content: 'Nova supports bidirectional real-time syncing with Salesforce, HubSpot, Zoho, and Pipedrive. Updates are pushed via webhooks within 500ms...',
        score: 0.96
      },
      {
        title: 'Data Security & Privacy Guidelines',
        content: 'All lead details and transcript data are encrypted in transit via TLS 1.3 and at rest...',
        score: 0.31
      }
    ],
    answer: 'Yes, Nova supports bidirectional, real-time syncing with Zoho, Salesforce, HubSpot, and Pipedrive. Database state changes are updated automatically via webhook triggers within 500ms of any agent action.'
  },
  {
    query: 'How does Nova Voice handle user interruptions?',
    retrievedChunks: [
      {
        title: 'Voice Agent Capabilities & Latency',
        content: 'Nova Voice uses a low-latency streaming... The agent handles interruptions by dumping the current audio queue the moment incoming user voice exceeds -20dB amplitude, entering a processing state...',
        score: 0.98
      },
      {
        title: 'Integrations & CRM Sync SLA',
        content: 'Nova supports bidirectional real-time syncing with...',
        score: 0.12
      }
    ],
    answer: 'Nova Voice detects user interruptions in real time. The moment the customer speaks (exceeding -20dB amplitude), Nova dumps its remaining audio output queue, pauses speaking, processes the new text input, and immediately generates an adaptive context-based response.'
  }
];

// Initial Objection Logs
export const initialObjections: Objection[] = [
  {
    id: 'obj-1',
    leadName: 'Rajesh Patel',
    company: 'Rajesh Motors',
    message: 'We are evaluating another tool called SalesRobot which is half the price.',
    type: 'competitor',
    strategy: 'Highlight Nova\'s multi-agent autonomous operations vs simple auto-dialers.',
    response: 'I understand SalesRobot is cheaper. However, they only trigger linear templates. Nova features 10 autonomous agents that handle enrichment, voice, objections, and CRM entry end-to-end, saving 12+ hours of sales rep manual work per lead.',
    timestamp: '11:42 AM'
  },
  {
    id: 'obj-2',
    leadName: 'Senthil Kumar',
    company: 'Chennai Agritech',
    message: 'We are too busy with harvest season, maybe contact us in November.',
    type: 'not ready',
    strategy: 'Validate timeline, but suggest a low-effort passive nurture or short trial.',
    response: 'Absolutely, harvest is your busiest time. Let\'s do this: I can enroll you in a passive Whatsapp market info alert (zero effort) and set a calendar trigger for October 25 to see if you have bandwidth. Does that sound fair?',
    timestamp: 'Yesterday'
  }
];

// Initial CRM updates log
export const initialCrmLogs: CRMLog[] = [
  {
    id: 'log-1',
    leadName: 'Rajesh Motors',
    field: 'Lead Status',
    oldValue: 'Warm',
    newValue: 'Qualified',
    timestamp: '11:43 AM'
  },
  {
    id: 'log-2',
    leadName: 'Rajesh Motors',
    field: 'BANT Match Score',
    oldValue: '45',
    newValue: '78',
    timestamp: '11:42 AM'
  },
  {
    id: 'log-3',
    leadName: 'Delhi Solar Systems',
    field: 'Next Follow-up',
    oldValue: '--',
    newValue: 'Aug 16, 2026',
    timestamp: '10:15 AM'
  },
  {
    id: 'log-4',
    leadName: 'Kavya Textiles',
    field: 'Enriched Fields',
    oldValue: '0',
    newValue: '4 (LinkedIn, GSTIN, Employee Size, Location)',
    timestamp: '09:30 AM'
  }
];

// Initial activity feed logs
export const initialActivities: AgentActivity[] = [
  {
    id: 'act-1',
    text: 'Research Agent completed background check on Bangalore TechCorp (Lead #4812)',
    timestamp: '12:05 PM',
    type: 'info',
    fromAgent: 'Research Agent'
  },
  {
    id: 'act-2',
    text: 'Qualification Agent rated Bangalore TechCorp as high intent (Score: 92)',
    timestamp: '12:06 PM',
    type: 'success',
    fromAgent: 'Qualification Agent'
  },
  {
    id: 'act-3',
    text: 'Handoff: Qualification Agent -> Communication Agent to trigger outreach',
    timestamp: '12:06 PM',
    type: 'handoff',
    fromAgent: 'Qualification Agent',
    toAgent: 'Communication Agent'
  },
  {
    id: 'act-4',
    text: 'Communication Agent sent tailored WhatsApp message regarding API integration',
    timestamp: '12:07 PM',
    type: 'info',
    fromAgent: 'Communication Agent'
  },
  {
    id: 'act-5',
    text: 'CRM Agent updated HubSpot database for Bangalore TechCorp',
    timestamp: '12:08 PM',
    type: 'info',
    fromAgent: 'CRM Agent'
  }
];

// Initial conversation transcripts for "Kavya Textiles" (Lead #4821)
export const initialChatTranscript: Message[] = [
  {
    id: 'ch-1',
    sender: 'customer',
    text: 'Hi, we saw your autonomous sales agents product. We are a textile manufacturing firm with about 80 leads per day. We want to know if it can handle customized inquiries in Tamil and Hindi.',
    timestamp: '10:20 AM'
  },
  {
    id: 'ch-2',
    sender: 'ai',
    text: 'Hello! Yes, absolutely. Nova supports translation and multi-lingual dialogs in 12 Indian languages, including Hindi and Tamil. Our Voice and Communication agents automatically translate customer replies and respond in their native language while maintaining the proper business context.',
    timestamp: '10:21 AM',
    agentName: 'Knowledge Agent'
  },
  {
    id: 'ch-3',
    sender: 'customer',
    text: 'That sounds good. What about your pricing plans? Do we pay per lead or a monthly platform fee?',
    timestamp: '10:22 AM'
  }
];
