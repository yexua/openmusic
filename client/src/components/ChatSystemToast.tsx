import { useEffect, useState } from 'react';
import { useChatSystemToastStore } from '../stores/chatSystemToastStore';

const VISIBLE_MS = 2800;
const FADE_MS = 320;

export default function ChatSystemToast() {
  const text = useChatSystemToastStore((s) => s.text);
  const seq = useChatSystemToastStore((s) => s.seq);
  const clear = useChatSystemToastStore((s) => s.clear);
  const [phase, setPhase] = useState<'hidden' | 'visible' | 'exit'>('hidden');

  useEffect(() => {
    if (!text) {
      setPhase('hidden');
      return;
    }

    setPhase('visible');
    const exitTimer = window.setTimeout(() => setPhase('exit'), VISIBLE_MS);
    const clearTimer = window.setTimeout(() => clear(), VISIBLE_MS + FADE_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(clearTimer);
    };
  }, [text, seq, clear]);

  if (!text || phase === 'hidden') return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-1 z-20 flex justify-center px-3">
      <p
        className={`max-w-[92%] truncate rounded-full border border-white/10 bg-black/55 px-3 py-1 text-center text-[11px] leading-5 text-netease-muted/90 shadow-lg backdrop-blur-sm transition-opacity duration-300 ${
          phase === 'exit' ? 'opacity-0' : 'opacity-100 animate-fade-in'
        }`}
        role="status"
        aria-live="polite"
      >
        {text}
      </p>
    </div>
  );
}
