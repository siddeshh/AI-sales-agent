import { 
  Lead, Conversation, CallSession, KnowledgeDocument, 
  KnowledgeChunk, Meeting, MeetingSlot, FollowUp, 
  DashboardMetrics, AgentInfo, AgentActivity, IndustryOption 
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Trans-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Leads
  async getLeads(stage?: string, scoreCategory?: string, search?: string): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (stage) params.append('stage', stage);
    if (scoreCategory) params.append('score_category', scoreCategory);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<Lead[]>(`/leads${query}`);
  },

  async getLeadById(id: number): Promise<Lead> {
    return request<Lead>(`/leads/${id}`);
  },

  async createLead(data: Partial<Lead>, autoRunAI: boolean = true): Promise<Lead> {
    return request<Lead>(`/leads?auto_run_ai=${autoRunAI}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateLead(id: number, data: Partial<Lead>): Promise<Lead> {
    return request<Lead>(`/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteLead(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/leads/${id}`, { method: 'DELETE' });
  },

  async researchLead(id: number): Promise<any> {
    return request(`/leads/${id}/research`, { method: 'POST' });
  },

  async scoreLead(id: number): Promise<any> {
    return request(`/leads/${id}/score`, { method: 'POST' });
  },

  async qualifyLead(id: number): Promise<any> {
    return request(`/leads/${id}/qualify`, { method: 'POST' });
  },

  async getOutreach(id: number, channel: string = 'whatsapp'): Promise<any> {
    return request(`/leads/${id}/outreach?channel=${channel}`, { method: 'POST' });
  },

  // Chat
  async getConversation(leadId: number, channel: string = 'chat'): Promise<Conversation> {
    return request<Conversation>(`/chat/conversation/${leadId}?channel=${channel}`);
  },

  async sendChatMessage(leadId: number, content: string, channel: string = 'chat', isHumanAgent: boolean = false): Promise<any> {
    return request('/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        content,
        channel,
        is_human_agent: isHumanAgent
      }),
    });
  },

  async toggleHandoff(conversationId: number, enableTakeover: boolean): Promise<any> {
    return request(`/chat/handoff-toggle/${conversationId}?enable_takeover=${enableTakeover}`, {
      method: 'POST',
    });
  },

  // Voice
  async initiateCall(leadId: number, phone?: string): Promise<CallSession> {
    return request<CallSession>('/voice/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, phone_number: phone }),
    });
  },

  async sendVoiceTurn(callId: number, userTranscript: string): Promise<any> {
    return request('/voice/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ call_id: callId, user_transcript: userTranscript }),
    });
  },

  async endCall(callId: number): Promise<any> {
    return request(`/voice/end/${callId}`, { method: 'POST' });
  },

  // Knowledge Base RAG
  async getDocuments(industry?: string): Promise<KnowledgeDocument[]> {
    const q = industry ? `?industry=${industry}` : '';
    return request<KnowledgeDocument[]>(`/knowledge${q}`);
  },

  async getDocumentChunks(docId: number): Promise<KnowledgeChunk[]> {
    return request<KnowledgeChunk[]>(`/knowledge/documents/${docId}/chunks`);
  },

  async uploadDocument(formData: FormData): Promise<KnowledgeDocument> {
    return request<KnowledgeDocument>('/knowledge/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async deleteDocument(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/knowledge/${id}`, { method: 'DELETE' });
  },

  async queryRAG(query: string, industry: string = 'real_estate'): Promise<any> {
    return request('/knowledge/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, industry }),
    });
  },

  // Meetings
  async getMeetingSlots(days: number = 5): Promise<MeetingSlot[]> {
    return request<MeetingSlot[]>(`/meetings/slots?days=${days}`);
  },

  async getMeetings(status?: string): Promise<Meeting[]> {
    const q = status ? `?status=${status}` : '';
    return request<Meeting[]>(`/meetings${q}`);
  },

  async scheduleMeeting(data: Partial<Meeting>): Promise<Meeting> {
    return request<Meeting>('/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Followups
  async getFollowups(status?: string): Promise<FollowUp[]> {
    const q = status ? `?status=${status}` : '';
    return request<FollowUp[]>(`/followups${q}`);
  },

  async executeFollowup(id: number): Promise<any> {
    return request(`/followups/execute/${id}`, { method: 'POST' });
  },

  // CRM
  async getCRMPipeline(): Promise<{ stages: string[]; pipeline: Record<string, { leads: Lead[]; count: number; total_value_inr: number }>; total_active_pipeline_value: number }> {
    return request('/crm/pipeline');
  },

  async moveStage(leadId: number, newStage: string): Promise<any> {
    return request('/crm/move-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, new_stage: newStage }),
    });
  },

  // Analytics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return request<DashboardMetrics>('/analytics/dashboard');
  },

  // Agents
  async getAgentsStatus(): Promise<{ total_workforce_agents: number; status: string; agents: AgentInfo[] }> {
    return request('/agents/status');
  },

  async getAgentActivities(limit: number = 30): Promise<AgentActivity[]> {
    return request<AgentActivity[]>(`/agents/activities?limit=${limit}`);
  },

  // Demo Controls
  async getIndustries(): Promise<{ current_industry: string; available_industries: IndustryOption[] }> {
    return request('/demo/industries');
  },

  async switchIndustry(industryId: string): Promise<any> {
    return request('/demo/switch-industry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry_id: industryId }),
    });
  },

  async resetDemoData(): Promise<any> {
    return request('/demo/reset', { method: 'POST' });
  },
};
