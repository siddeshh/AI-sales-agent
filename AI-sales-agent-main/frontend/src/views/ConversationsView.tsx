import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, User, Bot, AlertTriangle, UserCheck, 
  RefreshCw, CheckCircle2, Calendar, FileText, PhoneCall 
} from 'lucide-react';
import { Lead, Conversation } from '../types';
import { ScoreBadge, StageBadge } from '../components/Badges';
import { api } from '../services/api';

interface ConversationsViewProps {
  leads: Lead[];
  activeLeadId?: number;
  onRefreshLeads: () => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({
  leads,
  activeLeadId,
  onRefreshLeads,
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<number>(activeLeadId || (leads[0]?.id || 1));
  const [channel, setChannel] = useState<'chat' | 'whatsapp' | 'email'>('chat');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [humanTakeover, setHumanTakeover] = useState(false);
  const [ragSources, setRagSources] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const loadConversation = async () => {
    if (!selectedLeadId) return;
    try {
      const conv = await api.getConversation(selectedLeadId, channel);
      setConversation(conv);
      setHumanTakeover(conv.human_takeover);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadConversation();
  }, [selectedLeadId, channel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isTyping]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || !selectedLeadId) return;

    if (!customText) setInputMessage('');
    setIsSending(true);
    setIsTyping(true);

    try {
      const res = await api.sendChatMessage(
        selectedLeadId,
        textToSend,
        channel,
        humanTakeover
      );

      if (res.rag_sources && res.rag_sources.length > 0) {
        setRagSources(res.rag_sources);
      }

      await loadConversation();
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleToggleTakeover = async () => {
    if (!conversation) return;
    const nextState = !humanTakeover;
    setHumanTakeover(nextState);
    try {
      await api.toggleHandoff(conversation.id, nextState);
      await loadConversation();
    } catch (err) {
      console.error(err);
    }
  };

  const PRESET_PROMPTS = [
    'Hi, do you take bulk orders for printed tees?',
    'What is the price for 200 oversized tees?',
    'That is too expensive, another supplier quoted less.',
    'I only need about 30 pieces to start. Is that possible?',
    'How long will delivery take for 150 embroidered hoodies?',
    'Can we do a sample review call on Friday?',
    'Can I please speak to a human sales representative?',
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '260px 1fr 280px',
      gap: 0,
      height: 'calc(100vh - 104px)',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Column 1: Conversations List */}
      <div style={{
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
      }}>
        {/* Channel Filter */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: '4px',
        }}>
          {(['chat', 'whatsapp', 'email'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`btn btn-sm ${channel === ch ? 'btn-secondary' : 'btn-ghost'}`}
              style={{
                flex: 1,
                fontSize: '11px',
                height: '26px',
                fontWeight: channel === ch ? 600 : 500,
                textTransform: 'capitalize',
              }}
            >
              {ch}
            </button>
          ))}
        </div>

        {/* Lead Rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {leads.map((l) => {
            const isSelected = l.id === selectedLeadId;
            return (
              <div
                key={l.id}
                onClick={() => setSelectedLeadId(l.id)}
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #f1f5f9',
                  background: isSelected ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer',
                  borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    {l.name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {l.last_contacted ? new Date(l.last_contacted).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.requirements || 'No requirements shared yet'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Column 2: Active Conversation */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
      }}>
        {/* Header */}
        <div style={{
          height: '48px',
          padding: '0 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              {selectedLead?.name}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
              via {channel.toUpperCase()}
            </span>
            {channel !== 'chat' && (
              <span className="badge badge-amber" style={{ marginLeft: '8px' }}
                title={`No ${channel} integration: messages here are stored in this app only and are not sent by ${channel}.`}>
                Demo mode — simulated
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {humanTakeover ? (
              <span className="badge badge-amber">Human Representative Active</span>
            ) : (
              <span className="badge badge-green">AI Assistant Active</span>
            )}
            <button onClick={handleToggleTakeover} className="btn btn-secondary btn-sm" style={{ height: '26px', fontSize: '11px' }}>
              <UserCheck size={12} />
              <span>{humanTakeover ? 'Release' : 'Take Over'}</span>
            </button>
          </div>
        </div>

        {/* Human Takeover Notice if requested */}
        {conversation?.human_requested && !humanTakeover && (
          <div style={{
            padding: '8px 16px',
            background: '#fffbeb',
            borderBottom: '1px solid #fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#92400e' }}>
              <AlertTriangle size={14} color="#d97706" />
              <span>Customer requested human sales representative.</span>
            </div>
            <button onClick={handleToggleTakeover} className="btn btn-secondary btn-sm" style={{ height: '24px', fontSize: '11px' }}>
              Take Over Thread
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {(!conversation?.messages || conversation.messages.length === 0) ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No messages yet. Send an inquiry or select a preset prompt below.
            </div>
          ) : (
            conversation.messages.map((m) => {
              const isUser = m.sender === 'customer';
              const isHumanRep = m.sender === 'human_rep';

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                    {isUser ? selectedLead?.name : isHumanRep ? 'Human rep' : m.agent_name || 'Sales Assistant'}
                  </div>

                  <div style={{
                    padding: '9px 13px',
                    borderRadius: '6px',
                    background: isUser ? '#0f172a' : '#ffffff',
                    color: isUser ? '#ffffff' : '#0f172a',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.content}
                  </div>
                </div>
              );
            })
          )}

          {isTyping && (
            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot status-dot-blue" />
              <span>Sales Assistant is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Suggestions */}
        <div style={{
          padding: '6px 14px',
          background: '#ffffff',
          borderTop: '1px solid #f1f5f9',
          overflowX: 'auto',
          display: 'flex',
          gap: '6px',
          whiteSpace: 'nowrap',
        }}>
          {PRESET_PROMPTS.map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(promptText)}
              disabled={isSending}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', height: '24px', padding: '0 8px' }}
            >
              <span>{promptText.slice(0, 32)}...</span>
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div style={{
          padding: '12px 16px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <input
            type="text"
            placeholder={humanTakeover ? 'Reply as human sales rep...' : `Message as ${selectedLead?.name || 'Customer'}...`}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            className="form-input"
            style={{ height: '34px', fontSize: '13px' }}
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isSending || !inputMessage.trim()}
            className="btn btn-primary btn-sm"
            style={{ height: '34px' }}
          >
            <Send size={13} />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Column 3: Lead Context & Sales Assistant */}
      <div style={{
        padding: '16px',
        background: '#ffffff',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Prospect Details */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
            Prospect Context
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
            {selectedLead?.name}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Budget: {selectedLead?.budget || 'not shared'} • {selectedLead?.location || 'location unknown'}
          </div>
          <div style={{ marginTop: '6px' }}>
            <ScoreBadge score={selectedLead?.lead_score ?? 0} category={selectedLead?.score_category || 'Cold'} />
          </div>
        </div>

        {/* NLP Indicators */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
            Last message: intent &amp; sentiment
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '4px' }}>
              <span style={{ color: '#64748b' }}>Intent</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{conversation?.current_intent || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '4px' }}>
              <span style={{ color: '#64748b' }}>Sentiment</span>
              <span style={{ fontWeight: 600, color: conversation?.sentiment === 'Hesitant' ? '#d97706' : '#16a34a' }}>
                {conversation?.sentiment || 'Positive'}
              </span>
            </div>
          </div>
        </div>

        {/* Assistant Recommendation */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
            Assistant Recommendation
          </div>
          <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '2px' }}>
              {selectedLead?.next_best_action || 'Schedule Demo'}
            </div>
            <div style={{ fontSize: '11px', color: '#15803d', lineHeight: 1.4 }}>
              {selectedLead?.next_best_action_reason || 'Prospect meets BANT criteria.'}
            </div>
          </div>
        </div>

        {/* RAG Sources Citations */}
        {ragSources.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              Knowledge Base Citations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {ragSources.map((s, idx) => (
                <div key={idx} style={{ padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '11px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{s.title}</div>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>{s.excerpt}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
