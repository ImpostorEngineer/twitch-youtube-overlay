'use client';

import { useEffect, useState } from 'react';

const POLL_INTERVAL = 2500;

function getRoomInitials(name) {
  return name
    .split(/[\s_-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function OverlayClient({ room }) {
  const [queueState, setQueueState] = useState({
    current: null,
    next: null,
  });

  useEffect(() => {
    let mounted = true;
    const previousHtmlBackground = document.documentElement.style.background;
    const previousBodyBackground = document.body.style.background;

    async function refresh() {
      try {
        const response = await fetch(`/api/queue?roomId=${encodeURIComponent(room.id)}`, {
          cache: 'no-store',
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load room queue.');
        }

        if (mounted) {
          setQueueState(data);
        }
      } catch {
        if (mounted) {
          setQueueState({ current: null, next: null });
        }
      }
    }

    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    refresh();
    const intervalId = window.setInterval(refresh, POLL_INTERVAL);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.documentElement.style.background = previousHtmlBackground;
      document.body.style.background = previousBodyBackground;
    };
  }, [room.id]);

  return (
    <main className='flex min-h-screen items-end bg-transparent p-8 text-white'>
      <div className='w-full max-w-4xl rounded-[2rem] border border-white/15 bg-slate-950/45 p-6 shadow-2xl shadow-black/30 backdrop-blur-md animate-[fade-in_500ms_ease-out]'>
        <p className='mt-1 text-sm uppercase tracking-[0.35em] text-white'>Now Playing</p>
        <h1 className='mt-3 text-4xl font-semibold leading-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)] md:text-6xl'>
          {queueState.current?.title || 'Waiting for the next request'}
        </h1>
        <p className='mt-6 text-sm uppercase tracking-[0.35em] text-white'>Up Next</p>
        <p className='mt-2 text-2xl text-white md:text-3xl'>{queueState.next?.title || 'Queue is empty'}</p>
      </div>
    </main>
  );
}
