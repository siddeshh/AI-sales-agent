import { useCallback, useEffect, useRef, useState } from 'react';

/* Web Speech API speech-to-text (Chrome / Edge). Chrome sends the audio to Google's online speech service,
   so this needs an internet connection. TypeScript has no types for it, hence the small local interfaces. */

interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognitionCtor = new () => Recognition;

const getCtor = (): RecognitionCtor | undefined =>
  (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition
  || (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow the microphone in the address bar, or type below.',
  'service-not-allowed': 'Speech recognition is blocked in this browser. Type below instead.',
  network: 'Speech recognition needs internet (Chrome sends the audio to Google). Type below instead.',
  'audio-capture': 'No microphone was found. Type below instead.',
};

interface Options {
  lang?: string;
  onFinal: (text: string) => void;       // a finished utterance
  onSpeech?: (interim: string) => void;  // the user is talking (used for barge-in)
}

export function useSpeechRecognition({ lang = 'en-IN', onFinal, onSpeech }: Options) {
  const supported = typeof window !== 'undefined' && !!getCtor();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false); // keep listening until stop() (Chrome ends a session after silence)
  const cb = useRef({ onFinal, onSpeech });
  cb.current = { onFinal, onSpeech };

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    wantRef.current = true;
    setError('');
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript.trim();
        if (r.isFinal) {
          if (text) cb.current.onFinal(text);
        } else {
          live += `${text} `;
        }
      }
      setInterim(live.trim());
      if (live.trim()) cb.current.onSpeech?.(live.trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(ERRORS[e.error] || `Speech recognition error: ${e.error}`);
      if (e.error in ERRORS) wantRef.current = false;
    };
    rec.onend = () => {
      setInterim('');
      if (wantRef.current) {
        try { rec.start(); return; } catch { /* already restarting */ }
      }
      setListening(false);
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the microphone');
    }
  }, [lang]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.abort();
    recRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  useEffect(() => () => { wantRef.current = false; recRef.current?.abort(); }, []);

  return { supported, listening, interim, error, start, stop };
}

/** Words heard that are not in the sentence being spoken: an echo of our own voice has none. */
export function novelWordCount(heard: string, speaking: string): number {
  const said = new Set(speaking.toLowerCase().match(/[a-z0-9']+/g) || []);
  return (heard.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => !said.has(w)).length;
}
