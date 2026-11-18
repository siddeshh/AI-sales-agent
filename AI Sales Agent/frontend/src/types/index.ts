export interface ScoreFactor {
  id: number;
  factor_name: string;
  score_impact: number;
  explanation: string;
  category: string;
}

export interface Lead {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  industry: string;
  job_title?: string;
  location?: string;
  budget?: string;
  budget_numeric?: number;
  requirements?: string;
  timeline?: string;
  source: string;
  lead_score: number;
  conversion_probability: number;
  score_category: 'Cold' | 'Warm' | 'Qualified' | 'Hot';
  stage: string;
  qualification_status: 'Unqualified' | 'Partially Qualified' | 'Qualified';
  budget_qualified: boolean;
  authority_qualified: boolean;
  need_qualified: boolean;
  timeline_qualified: boolean;
  research_summary?: string;
  pain_points?: string;
  buying_intent?: string;
  next_best_action?: string;
  next_best_action_reason?: string;
  last_contacted?: string;
  next_followup?: string;
  assigned_rep?: string;
  created_at: string;
  updated_at?: string;
  score_factors?: ScoreFactor[];
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'customer' | 'ai_agent' | 'human_rep';
  agent_name?: string;
  content: string;
  intent?: string;
  sentiment?: string;
  detected_objection?: string;
  confidence?: number;
  created_at: string;
}

export interface Conversation {
  id: number;
  lead_id: number;
  channel: string;
  status: string;
  sentiment: string;
  current_intent: string;
  human_requested: boolean;
  human_takeover: boolean;
  summary?: string;
  created_at: string;
  updated_at?: string;
  messages: Message[];
}

export interface CallTurn {
  speaker: 'ai' | 'customer';
  text: string;
}

export interface CallSession {
  id: number;
  lead_id: number;
  caller_name: string;
  phone_number?: string;
  status: string;
  duration_seconds: number;
  live_transcript?: string;
  summary?: string;
  sentiment: string;
  lead_score_after: number;
  action_items?: string;
  created_at: string;
}

export interface KnowledgeDocument {
  id: number;
  title: string;
  filename: string;
  file_type: string;
  category: string;
  industry: string;
  total_chunks: number;
  file_size_bytes: number;
  is_processed: boolean;
  created_at: string;
}

export interface KnowledgeChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
}

export interface Meeting {
  id: number;
  lead_id: number;
  lead_name?: string;
  title: string;
  meeting_type: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  location_or_link: string;
  notes?: string;
  created_at: string;
}

export interface MeetingSlot {
  iso: string;
  display: string;
  date: string;
  time: string;
  is_weekend: boolean;
  recommended_for: string;
}

export interface FollowUp {
  id: number;
  lead_id: number;
  lead_name?: string;
  cadence_step: number;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  channel: string;
  title: string;
  message_content?: string;
  executed_at?: string;
  created_at: string;
}

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'trend' | 'recommendation' | 'warning';
  title: string;
  description: string;
  impact: string;
  action_text: string;
  action_type: string;
}

export interface DashboardMetrics {
  kpis: {
    total_leads: number;
    new_leads: number;
    hot_leads: number;
    qualified_leads: number;
    meetings_scheduled: number;
    conversion_rate: number;
    pipeline_value_inr: number;
    ai_conversations_count: number;
    active_followups: number;
  };
  funnel: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  score_distribution: Record<string, number>;
  insights: AIInsight[];
}

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  status: string;
  description: string;
  icon: string;
  invocations_count: number;
}

export interface AgentActivity {
  id: number;
  agent_name: string;
  action_type: string;
  lead_id?: number;
  lead_name?: string;
  description: string;
  details?: string;
  status: string;
  created_at: string;
}

export interface IndustryOption {
  id: string;
  name: string;
  lead_sample: string;
  meeting_type: string;
  currency: string;
  description: string;
}
