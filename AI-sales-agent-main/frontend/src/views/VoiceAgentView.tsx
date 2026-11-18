import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, PhoneOff, Mic, Play, 
  CheckCircle2, Clock, Check 
} from 'lucide-react';
import { Lead, CallSession } from '../types';
import { api } from '../services/api';

interface VoiceAgentViewProps {
  leads: Lead[];
  onRefreshLeads: () => void;
}

export const VoiceAgentView: React.FC<VoiceAgentViewProps> = ({ leads, onRefreshLeads }) => {
  const [selectedLeadId, setSelectedLeadId] = useState<number>(leads[0]?.id || 1);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcriptTurns, setTranscriptTurns] = useState<Array<{ speaker: string; text: string }>>([]);
  const [currentSentiment, setCurrentSentiment] = useState('Neutral');
  const [currentIntent, setCurrentIntent] = useState('Discovery Intro');
  const [spokenInput, setSpokenInput] = useState('');
  const [callEndedSummary, setCallEndedSummary] = useState<any>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  useEffect(() => {
    let interval: any = null;
    if (isCalling) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartCall = async () => {
    setCallEndedSummary(null);
    setDuration(0);
    try {
      const call = await api.initiateCall(selectedLeadId, selectedLead?.phone);
      setCallSession(call);
      setIsCalling(true);
      const initialText = `Hello ${selectedLead?.name?.split(' ')[0] || 'there'}, this is the AI assistant from Celestial Wear. I'm an AI, not a person. I'm calling about your enquiry for bulk apparel. Is now a good time for two minutes?`;
      setTranscriptTurns([
        { speaker: 'ai', text: initialText }
      ]);
      speakText(initialText);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendVoiceUtterance = async (utterance: string) => {
    if (!callSession || !utterance) return;
    setSpokenInput('');
    setTranscriptTurns((prev) => [...prev, { speaker: 'customer', text: utterance }]);

    try {
      const res = await api.sendVoiceTurn(callSession.id, utterance);
      setCurrentIntent(res.intent);
      setCurrentSentiment(res.sentiment);
      setTranscriptTurns((prev) => [...prev, { speaker: 'ai', text: res.spoken_response }]);
      speakText(res.spoken_response);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndCall = async () => {
    if (!callSession) return;
    setIsCalling(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    try {
      const summary = await api.endCall(callSession.id);
      setCallEndedSummary(summary);
      onRefreshLeads();
    } catch (err) {
      console.error(err);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const VOICE_PROMPTS = [
    'Hello, who is this calling?',
    'What is the price for crew tees in bulk?',
    'That is too expensive for us.',
    'I only need about 30 pieces, is there a minimum order?',
    'How long does delivery take?',
    'Can we do a sample review call on Friday?',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Voice call</h2>
          <p>Browser voice session: replies are spoken with your browser's text-to-speech. You type or pick the customer's lines (no speech-to-text). No phone call is placed.</p>
        </div>

        {/* Lead Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Target Prospect:</span>
          <select
            value={selectedLeadId}
            disabled={isCalling}
            onChange={(e) => setSelectedLeadId(Number(e.target.value))}
            className="form-select"
            style={{ width: 'auto', height: '32px', fontSize: '13px' }}
          >
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — {l.phone || '+91 98200 00000'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left Active Dialer & Transcript, Right Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        {/* Left: Call Window */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          {/* Active Call HUD */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '6px',
            background: isCalling ? 'var(--brand-soft)' : 'var(--muted)',
            border: `1px solid ${isCalling ? 'var(--brand-border)' : 'var(--border)'}`,
            marginBottom: '16px',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)' }}>
                {selectedLead?.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                {selectedLead?.phone || '+91 98201 44821'} • {selectedLead?.requirements}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {isCalling && (
                <div style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand)' }}>
                  {formatDuration(duration)}
                </div>
              )}

              {!isCalling ? (
                <button onClick={handleStartCall} className="btn btn-primary btn-sm">
                  <PhoneCall size={13} />
                  <span>Start Outbound Call</span>
                </button>
              ) : (
                <button onClick={handleEndCall} className="btn btn-danger btn-sm">
                  <PhoneOff size={13} />
                  <span>End Call</span>
                </button>
              )}
            </div>
          </div>

          {/* Transcript Feed */}
          <div style={{
            flex: 1,
            minHeight: '260px',
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '14px',
            borderRadius: '6px',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            marginBottom: '16px',
          }}>
            {transcriptTurns.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '14px' }}>
                Click "Start Outbound Call" to initiate conversation.
              </div>
            ) : (
              transcriptTurns.map((turn, i) => {
                const isCustomer = turn.speaker === 'customer';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isCustomer ? 'flex-end' : 'flex-start',
                      alignSelf: isCustomer ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginBottom: '2px' }}>
                      {isCustomer ? selectedLead?.name : 'Celestial Wear AI assistant'}
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: isCustomer ? 'var(--foreground)' : 'var(--muted)',
                      color: isCustomer ? 'var(--card)' : 'var(--foreground)',
                      border: isCustomer ? 'none' : '1px solid var(--border)',
                      fontSize: '14px',
                      lineHeight: 1.5,
                    }}>
                      {turn.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Spoken Utterance Simulator */}
          {isCalling && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Simulate Prospect Speech:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {VOICE_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendVoiceUtterance(p)}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '26px', fontSize: '12px' }}
                  >
                    <span>"{p}"</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Or type custom spoken customer reply..."
                  value={spokenInput}
                  onChange={(e) => setSpokenInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendVoiceUtterance(spokenInput);
                  }}
                  className="form-input"
                  style={{ height: '32px', fontSize: '14px' }}
                />
                <button
                  onClick={() => handleSendVoiceUtterance(spokenInput)}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '32px' }}
                >
                  <Play size={13} />
                  <span>Speak</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Telemetry & Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--foreground)', marginBottom: '10px' }}>
              Call Telemetry
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--muted)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Status</span>
                <span style={{ fontWeight: 600, color: isCalling ? 'var(--success)' : 'var(--muted-foreground)' }}>
                  {isCalling ? '● In Progress' : 'Idle'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--muted)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Detected Intent</span>
                <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{currentIntent}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--muted)', borderRadius: '4px' }}>
                <span style={{ color: 'var(--muted-foreground)' }}>Sentiment</span>
                <span style={{ fontWeight: 600, color: currentSentiment === 'Hesitant' ? 'var(--warning)' : 'var(--success)' }}>
                  {currentSentiment}
                </span>
              </div>
            </div>
          </div>

          {/* Post Call Notes */}
          {callEndedSummary && (
            <div className="card" style={{ background: 'var(--success-soft)', borderColor: 'var(--success-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, color: 'var(--success)', marginBottom: '6px' }}>
                <CheckCircle2 size={15} color="var(--success)" />
                <span>Call summary (saved to the internal CRM)</span>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--success)', lineHeight: 1.4, marginBottom: '8px' }}>
                {callEndedSummary.summary}
              </div>

              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)', marginBottom: '2px' }}>
                Action Items:
              </div>
              <div style={{ fontSize: '12px', color: 'var(--success)', whiteSpace: 'pre-wrap' }}>
                {callEndedSummary.action_items}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
