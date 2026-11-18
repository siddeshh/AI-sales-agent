import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Send, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lead, CallSession } from '../types';
import { api } from '../services/api';
import { cn } from '@/lib/utils';
import { novelWordCount, useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface VoiceAgentViewProps {
  leads: Lead[];
  onRefreshLeads: () => void;
}

interface Turn { speaker: 'ai' | 'customer'; text: string; agent?: string }
interface EndResult {
  summary: string; summary_provider: string; bant_updated: boolean; qualification_status: string;
  lead_score_after: number; next_action: string; duration_seconds: number;
}

export const VoiceAgentView: React.FC<VoiceAgentViewProps> = ({ leads, onRefreshLeads }) => {
  const [leadId, setLeadId] = useState<number | undefined>(leads[0]?.id);
  const [call, setCall] = useState<CallSession | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [bargedIn, setBargedIn] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [ended, setEnded] = useState<EndResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const lead = leads.find((l) => l.id === leadId) || leads[0];

  const callRef = useRef<CallSession | null>(null);
  const queue = useRef<string[]>([]);       // utterances heard while a reply is still being fetched
  const sending = useRef(false);
  const speakingText = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);
  callRef.current = call;

  // scroll only the transcript box (scrollIntoView would scroll the whole page and hide the End call button)
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [turns.length, busy]);
  useEffect(() => {
    if (!call || ended) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [call, ended]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang === 'en-IN') ;
    if (voice) u.voice = voice;
    u.onstart = () => { setSpeaking(true); setBargedIn(false); };
    u.onend = u.onerror = () => { setSpeaking(false); speakingText.current = ''; };
    speakingText.current = text;
    window.speechSynthesis.speak(u);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setBargedIn(true);
    }
  };

  const sendNext = async () => {
    const c = callRef.current;
    if (sending.current || !c || queue.current.length === 0) return;
    sending.current = true;
    setBusy(true);
    const text = queue.current.shift()!;
    setTurns((t) => [...t, { speaker: 'customer', text }]);
    try {
      const res = await api.sendVoiceTurn(c.id, text);
      setTurns(res.transcript);
      if (res.spoken_response) speak(res.spoken_response);
      else setError('A human has taken over this conversation, so the AI did not answer.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The reply failed');
    } finally {
      sending.current = false;
      setBusy(false);
      if (queue.current.length) sendNext();
    }
  };

  const hear = (text: string) => {
    if (!callRef.current) return;
    stopSpeaking(); // a finished utterance always wins over playback
    queue.current.push(text);
    sendNext();
  };

  const speech = useSpeechRecognition({
    onFinal: hear,
    // Barge-in: stop playback as soon as the customer starts talking. Words that are all in the sentence
    // being spoken are our own voice coming back through the speakers, so they don't count.
    onSpeech: (interim) => {
      if (window.speechSynthesis?.speaking && novelWordCount(interim, speakingText.current) >= 2) stopSpeaking();
    },
  });

  const startCall = async () => {
    if (!lead) return;
    setError('');
    setEnded(null);
    setSeconds(0);
    try {
      const c = await api.initiateCall(lead.id);
      setCall(c);
      const t: Turn[] = JSON.parse(c.live_transcript || '[]');
      setTurns(t);
      speak(t[0]?.text || '');  // the opening line says it is an AI assistant
      if (speech.supported) speech.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the call');
    }
  };

  const endCall = async () => {
    if (!call) return;
    speech.stop();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setBusy(true);
    try {
      setEnded(await api.endCall(call.id));
      onRefreshLeads();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end the call');
    } finally {
      setBusy(false);
      setCall(null);
    }
  };

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const active = !!call;
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2>Voice call</h2>
          <p>Talk to the AI assistant as the customer. Each sentence goes through the same agents as chat.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="badge badge-blue" title="Chrome sends the audio to Google's speech service, so it needs internet. Edge works too.">
              Uses browser speech recognition (Chrome)
            </span>
            <span className="badge badge-gray">Replies spoken with browser text-to-speech</span>
            <span className="badge badge-gray">No phone call is placed</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={lead?.id} disabled={active} onChange={(e) => setLeadId(Number(e.target.value))} className="form-select w-56">
            {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {active
            ? <Button variant="destructive" onClick={endCall} disabled={busy}><PhoneOff /> End call</Button>
            : <Button onClick={startCall} disabled={!lead}><PhoneCall /> Start call</Button>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="min-h-[480px] gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="flex items-center justify-between text-[15px]">
              <span>{active ? `On the call with ${lead?.name}` : 'Transcript'}</span>
              {active && <span className="font-mono text-sm text-muted-foreground">{mmss}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3 px-5">
            <div ref={scrollRef} className="max-h-[360px] flex-1 space-y-3 overflow-y-auto">
              {turns.length === 0 && (
                <div className="pt-16 text-center text-sm text-muted-foreground">Pick a lead and press Start call. Allow the microphone when Chrome asks.</div>
              )}
              {turns.map((t, i) => (
                <div key={i} className={cn('flex flex-col gap-1', t.speaker === 'customer' ? 'items-end' : 'items-start')}>
                  <div className="text-xs text-muted-foreground">
                    {t.speaker === 'customer' ? `${lead?.name} (you)` : <span className="badge badge-blue">{t.agent || 'AI'}</span>}
                  </div>
                  <div className={cn('max-w-[80%] rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed',
                    t.speaker === 'customer' ? 'bg-primary text-primary-foreground' : 'border bg-card')}>
                    {t.text}
                  </div>
                </div>
              ))}
              {busy && active && <div className="text-xs text-muted-foreground">The AI is answering…</div>}
            </div>

            {active && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm">
                  {speech.listening ? (
                    <><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-success" /></span>
                      <Mic className="size-4" /> <span className="font-medium">Listening…</span></>
                  ) : (
                    <><MicOff className="size-4 text-muted-foreground" /><span className="text-muted-foreground">Not listening</span></>
                  )}
                  {speaking && <span className="ml-auto flex items-center gap-1 text-muted-foreground"><Volume2 className="size-4" /> Assistant is speaking (start talking to interrupt)</span>}
                  {bargedIn && !speaking && <span className="ml-auto text-xs text-muted-foreground">Interrupted</span>}
                </div>
                <div className="mt-1 min-h-5 text-[14px] italic text-muted-foreground">{speech.interim}</div>
                {speech.supported && (
                  <Button variant="outline" size="sm" className="mt-2"
                    onClick={() => (speech.listening ? speech.stop() : speech.start())}>
                    {speech.listening ? <><MicOff /> Mute microphone</> : <><Mic /> Listen again</>}
                  </Button>
                )}
              </div>
            )}

            {/* Text fallback: always available, and the only input when the browser has no speech recognition */}
            {active && (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) { hear(typed.trim()); setTyped(''); } }}>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} className="form-input"
                  placeholder={speech.supported ? 'Or type what the customer says…' : 'Speech recognition is not available in this browser. Type what the customer says…'} />
                <Button type="submit" variant="outline" disabled={!typed.trim()}><Send /> Send</Button>
              </form>
            )}
            {(error || speech.error) && <div className="text-sm text-danger">{speech.error || error}</div>}
            {!speech.supported && !active && (
              <div className="text-sm text-muted-foreground">This browser has no speech recognition (use Chrome or Edge). You can still type during the call.</div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-[15px]">After the call</CardTitle>
            <CardDescription>The summary is saved to the CRM and BANT is updated from the call.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 text-[14px]">
            {!ended && <div className="text-sm text-muted-foreground">End a call to see its 4-line summary here.</div>}
            {ended && (
              <>
                <ol className="list-decimal space-y-1 pl-5">
                  {ended.summary.split('\n').map((l, i) => <li key={i}>{l}</li>)}
                </ol>
                <div className="text-xs text-muted-foreground">Summary by: {ended.summary_provider} · {ended.duration_seconds}s call</div>
                <div className="flex flex-wrap gap-2">
                  <span className={cn('badge', ended.bant_updated ? 'badge-green' : 'badge-gray')}>
                    {ended.bant_updated ? `BANT updated: ${ended.qualification_status}` : 'BANT not updated (no language model)'}
                  </span>
                  <span className="badge badge-gray">Score now {ended.lead_score_after}/100</span>
                </div>
                <div><span className="text-muted-foreground">Next step: </span>{ended.next_action}</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
