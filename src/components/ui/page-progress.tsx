"use client";

import { useEffect, useState } from 'react';

export default function PageProgress() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleStart = () => setActive(true);
    const handleStop = () => setActive(false);

    window.addEventListener('beforeunload', handleStart);
    // Basic hook: when history changes, show briefly (client-only)
    const onClick = () => {
      setActive(true);
      setTimeout(() => setActive(false), 600);
    };
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('beforeunload', handleStart);
      window.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div
      aria-hidden
      className={`fixed left-0 top-0 z-50 h-0.5 w-full transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>
      <div className="h-0.5 w-3/4 origin-left animate-progress bg-accent" />
      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0.02); }
          50% { transform: scaleX(0.6); }
          100% { transform: scaleX(0.98); }
        }
        .animate-progress { transform-origin: left; animation: progress 0.6s ease-in-out; }
      `}</style>
    </div>
  );
}
