'use client';

import { useEffect, useRef, useState } from 'react';
import Queue from './queue';

const POLL_INTERVAL = 2500;

function getYouTubeScript() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');

    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
  });
}

function getAddFailureMessage(reason) {
  if (reason === 'duplicate') {
    return 'That song is already in the queue.';
  }

  if (reason === 'user_limit') {
    return 'That requester already has too many songs queued.';
  }

  if (reason === 'queue_full') {
    return 'The queue is full right now.';
  }

  return 'Unable to add that song right now.';
}

function getHiddenThumbnail(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
}

const emptyQueueState = {
  queue: [],
  currentIndex: 0,
  current: null,
  next: null,
};

export default function PlayerClient() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const currentVideoIdRef = useRef('');
  const loadedVideoIdRef = useRef('');
  const refreshQueueRef = useRef(null);
  const skipQueueRef = useRef(null);

  const [queueState, setQueueState] = useState(emptyQueueState);
  const [playlistStatus, setPlaylistStatus] = useState('');
  const [manualVideoInput, setManualVideoInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');

  const currentVideoId = queueState.current?.videoId || '';
  const currentTitle = queueState.current?.title || 'Nothing queued yet';
  const hiddenThumbnail = getHiddenThumbnail(currentVideoId);

  function applyTinyQuality() {
    if (!playerRef.current?.setPlaybackQuality) {
      return;
    }

    try {
      playerRef.current.setPlaybackQuality('tiny');
    } catch {}
  }

  async function refreshQueue(options = {}) {
    if (options.withSpinner) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch('/api/queue', { cache: 'no-store' });
      const data = await response.json();
      setQueueState(data);
    } catch {
      setError('Unable to refresh queue state.');
    } finally {
      if (options.withSpinner) {
        setIsRefreshing(false);
      }
    }
  }

  async function skipQueue() {
    try {
      await fetch('/api/queue/skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await refreshQueueRef.current?.();
    } catch {
      setError('Unable to skip the current song.');
    }
  }

  useEffect(() => {
    currentVideoIdRef.current = currentVideoId;
  }, [currentVideoId]);

  useEffect(() => {
    refreshQueueRef.current = refreshQueue;
    skipQueueRef.current = skipQueue;
  });

  useEffect(() => {
    let cancelled = false;

    const setupPlayer = async () => {
      const YT = await getYouTubeScript();

      if (cancelled || playerRef.current || !containerRef.current) {
        return;
      }

      playerRef.current = new YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: currentVideoIdRef.current,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setIsReady(true);
            setIsPlaying(false);
            loadedVideoIdRef.current = currentVideoIdRef.current;
            applyTinyQuality();
          },
          onStateChange: async (event) => {
            applyTinyQuality();

            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            }

            if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.ENDED ||
              event.data === window.YT.PlayerState.CUED
            ) {
              setIsPlaying(false);
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              await skipQueueRef.current?.();
            }
          },
          onError: () => {
            setError('This video could not be embedded. Try skipping to the next track.');
          },
        },
      });
    };

    setupPlayer();

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
      loadedVideoIdRef.current = '';
    };
  }, []);

  useEffect(() => {
    if (!isReady || !playerRef.current) {
      return;
    }

    if (!currentVideoId) {
      loadedVideoIdRef.current = '';
      playerRef.current.stopVideo?.();
      return;
    }

    if (loadedVideoIdRef.current === currentVideoId) {
      return;
    }

    playerRef.current.loadVideoById(currentVideoId);
    loadedVideoIdRef.current = currentVideoId;
    setIsPlaying(true);
    applyTinyQuality();
    setError('');
  }, [currentVideoId, isReady]);

  useEffect(() => {
    void refreshQueue();

    const intervalId = window.setInterval(() => {
      void refreshQueueRef.current?.();
    }, POLL_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    document.title = currentTitle ? `Playing: ${currentTitle}` : 'Player Control';

    return () => {
      document.title = 'Player Control';
    };
  }, [currentTitle]);

  async function loadPlaylist() {
    setPlaylistStatus('Loading playlist...');
    setError('');

    try {
      const response = await fetch('/api/playlist', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Playlist request failed.');
      }

      const videos = Array.isArray(data.videos) ? data.videos : [];
      await fetch('/api/queue/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos }),
      });

      setPlaylistStatus(`Loaded ${videos.length} playlist items.`);
      await refreshQueue();
    } catch (loadError) {
      setPlaylistStatus('');
      setError(loadError.message || 'Unable to load playlist.');
    }
  }

  async function playPrevious() {
    const previousIndex = queueState.currentIndex - 1;
    if (previousIndex < 0 || !queueState.queue[previousIndex]) {
      return;
    }

    try {
      await fetch('/api/queue/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: previousIndex }),
      });
      await refreshQueue();
    } catch {
      setError('Unable to jump to the previous song.');
    }
  }

  function togglePlayback() {
    if (!playerRef.current || !currentVideoId) {
      return;
    }

    applyTinyQuality();

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      return;
    }

    playerRef.current.playVideo();
    setIsPlaying(true);
  }

  async function playQueueItem(index) {
    try {
      const response = await fetch('/api/queue/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to update current track.');
      }

      setQueueState(data);
      setError('');
    } catch (playError) {
      setError(playError.message || 'Unable to play the selected song.');
    }
  }

  async function removeQueueItem(index) {
    try {
      const response = await fetch('/api/queue/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to remove that song.');
      }

      setQueueState(data);
      setError('');
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove that song.');
    }
  }

  async function shuffleQueue() {
    try {
      const response = await fetch('/api/queue/shuffle', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to shuffle the queue.');
      }

      setQueueState(data);
      setPlaylistStatus('Shuffled upcoming songs.');
      setError('');
    } catch (shuffleError) {
      setError(shuffleError.message || 'Unable to shuffle the queue.');
    }
  }

  async function addManualVideo() {
    const input = manualVideoInput.trim();
    if (!input) {
      return;
    }

    setIsAddingVideo(true);
    setError('');
    setPlaylistStatus('');

    try {
      const response = await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          requestedBy: 'dashboard',
          source: 'manual',
          insertAfterCurrent: true,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to add the video.');
      }

      if (!data.added) {
        throw new Error(getAddFailureMessage(data.reason));
      }

      setManualVideoInput('');
      setPlaylistStatus(`Queued next: ${data.video.title}`);
      setQueueState(data);
    } catch (addError) {
      setError(addError.message || 'Unable to add the manual video.');
    } finally {
      setIsAddingVideo(false);
    }
  }

  return (
    <main className='flex min-h-screen items-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(160deg,_#020617,_#0f172a_45%,_#111827)] px-4 py-6 text-white lg:px-6'>
      <div className='mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]'>
        <section className='relative z-0 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/30 backdrop-blur xl:p-6'>
          <div>
            <p className='text-sm uppercase tracking-[0.28em] text-cyan-200/80'>Control Room</p>
            <h1 className='mt-2 text-3xl font-semibold'>YouTube music player</h1>
          </div>

          <div className='mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black'>
            <div className='youtube-frame relative aspect-video w-full max-h-[42vh] min-h-[15rem] overflow-hidden rounded-[1.5rem]'>
              <div
                ref={containerRef}
                className={`youtube-player-shell absolute inset-0 h-full w-full transition-opacity duration-300 ${
                  isVideoVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              />

              {!isVideoVisible && (
                <div className='absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-950'>
                  {hiddenThumbnail ? (
                    <>
                      <img
                        src={hiddenThumbnail}
                        alt={`${currentTitle} thumbnail`}
                        className='h-full w-full object-cover'
                      />
                      <div className='absolute inset-0' />
                    </>
                  ) : (
                    <div className='text-sm uppercase tracking-[0.3em] text-slate-500'>Video hidden</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className='mt-4 flex flex-wrap items-center gap-3'>
            <button
              onClick={playPrevious}
              className='flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/6 text-xl transition hover:bg-white/12'
              aria-label='Previous song'
            >
              ⏮
            </button>
            <button
              onClick={togglePlayback}
              className='flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl text-white transition hover:bg-red-500'
              aria-label={isPlaying ? 'Pause current song' : 'Play current song'}
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <button
              onClick={() => void skipQueue()}
              className='flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/6 text-xl transition hover:bg-white/12'
              aria-label='Skip song'
            >
              ⏭
            </button>
            <div className='ml-auto flex flex-wrap gap-3'>
              <button
                onClick={() => setIsVideoVisible((visible) => !visible)}
                className='rounded-full border border-cyan-400/50 px-5 py-2 font-semibold text-cyan-100 transition hover:bg-cyan-400/10'
              >
                {isVideoVisible ? 'Hide Video' : 'Show Video'}
              </button>
              <button
                onClick={loadPlaylist}
                className='rounded-full border border-white/15 px-5 py-2 font-semibold transition hover:bg-white/10'
              >
                Reload Playlist
              </button>
            </div>
          </div>

          <div className='mt-4 space-y-4'>
            <div className='rounded-[1.5rem] border border-white/10 bg-white/5 p-5 min-h-[15rem]'>
              <p className='text-sm uppercase tracking-[0.25em] text-slate-400'>Now playing</p>
              <h2 className='mt-2 line-clamp-3 max-w-[34ch] overflow-hidden text-ellipsis break-words text-xl font-semibold leading-tight md:text-2xl'>
                {currentTitle}
              </h2>
              <p className='mt-2 text-sm text-slate-400'>
                Queue position {queueState.currentIndex + 1} of {Math.max(queueState.queue.length, 1)}
              </p>
              <p className='mt-4 line-clamp-2 max-w-[50ch] overflow-hidden text-ellipsis break-words text-sm text-slate-300'>
                Next up: {queueState.next?.title || 'Nothing queued after this'}
              </p>
            </div>

            <div className='rounded-[1.5rem] border border-white/10 bg-white/5 p-5'>
              <label className='block text-sm font-medium text-slate-300'>Add video by ID or YouTube URL</label>
              <div className='mt-2 flex flex-col gap-2 sm:flex-row'>
                <input
                  value={manualVideoInput}
                  onChange={(event) => setManualVideoInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void addManualVideo();
                    }
                  }}
                  placeholder='dQw4w9WgXcQ or https://youtu.be/...'
                  className='min-w-0 flex-1 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300'
                />
                <button
                  onClick={addManualVideo}
                  disabled={isAddingVideo}
                  className='rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isAddingVideo ? 'Adding...' : 'Add Video'}
                </button>
              </div>
            </div>
          </div>

          {(playlistStatus || error) && (
            <div className='mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200'>
              {error || playlistStatus}
            </div>
          )}
        </section>

        <Queue
          queue={queueState.queue}
          currentIndex={queueState.currentIndex}
          isRefreshing={isRefreshing}
          onPlayItem={playQueueItem}
          onRemoveItem={removeQueueItem}
          onRefresh={() => void refreshQueue({ withSpinner: true })}
          onShuffle={() => void shuffleQueue()}
        />
      </div>
    </main>
  );
}
