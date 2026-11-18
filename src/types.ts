export type LeadStatus = 'Cold' | 'Warm' | 'Qualified' | 'Hot';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  score: number;
  status: LeadStatus;
  source: string;
  nextFollowUp: string;
  angle: number; // Orbit angle in radians or degrees
  targetRadius: number; // Current target radius for orbit visualization
  currentRadius: number; // Current animated radius
}

export interface Agent {
  id: string;
  name: string;
  responsibility: string;
  status: 'idle' | 'working' | 'handoff';
  angle: number; // Angle around the orbit map in degrees (0-360)
  iconName: string;
}

export interface Message {
  id: string;
  sender: 'customer' | 'ai';
  text: string;
  timestamp: string;
  agentName?: string;
}

export interface AIReasoning {
  detectedNeed: string;
  bantStatus: {
    budget: boolean;
    authority: boolean;
    need: boolean;
    timeline: boolean;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  objectionDetected: boolean;
  objectionType?: 'price' | 'competitor' | 'not ready' | 'technical';
  responseStrategy?: string;
}

export interface Objection {
  id: string;
  leadName: string;
  company: string;
  message: string;
  type: 'price' | 'competitor' | 'not ready' | 'technical';
  strategy: string;
  response: string;
  timestamp: string;
}

export interface CRMLog {
  id: string;
  leadName: string;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

export interface RAGDoc {
  id: string;
  title: string;
  content: string;
  category: 'Pricing' | 'Product' | 'Security';
}

export interface RAGTrace {
  query: string;
  retrievedChunks: {
    title: string;
    content: string;
    score: number;
  }[];
  answer: string;
}

export interface AgentActivity {
  id: string;
  text: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'handoff';
  fromAgent?: string;
  toAgent?: string;
}
