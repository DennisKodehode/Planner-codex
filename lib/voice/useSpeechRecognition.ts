import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionState = 'idle' | 'listening' | 'error';

export function useSpeechRecognition({ onTranscript }: { onTranscript: (text: string) => void }) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [state, setState] = useState<RecognitionState>('idle');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ??
      (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    setSupported(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .join(' ')
        .trim();
      if (transcript) {
        onTranscript(transcript);
      }
      setState('idle');
    };

    recognition.onerror = () => {
      setState('error');
    };

    recognition.onend = () => {
      setState('idle');
    };

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setState('listening');
    } catch (error) {
      console.error('Speech recognition error', error);
      setState('error');
    }
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
  }, []);

  return { start, stop, state, supported };
}

export function speak(text: string, locale?: string) {
  if (typeof window === 'undefined' || typeof window.speechSynthesis === 'undefined') return;
  const utterance = new SpeechSynthesisUtterance(text);
  if (locale) utterance.lang = locale;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
