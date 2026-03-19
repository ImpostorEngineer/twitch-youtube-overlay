"use client";

import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL = 2500;

function getYouTubeScript() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
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

export default function PlayerClient() {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [queueState, setQueueState] = useState({
    queue: [],
    currentIndex: 0,
    current: null,
    next: null,
  });
  const [playlistStatus, setPlaylistStatus] = useState("");
  const [manualVideoId, setManualVideoId] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  const currentVideoId = queueState.current?.videoId || "";
  const currentTitle = queueState.current?.title || "Nothing queued yet";
  const currentVideoIdRef = useRef(currentVideoId);
  const skipQueueRef = useRef(null);

  async function refreshQueue() {
    try {
      const response = await fetch("/api/queue", { cache: "no-store" });
      const data = await response.json();
      setQueueState(data);
    } catch {
      setError("Unable to refresh queue state.");
    }
  }

  async function skipQueue() {
    try {
      await fetch("/api/queue/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await refreshQueue();
    } catch {
      setError("Unable to skip the current song.");
    }
  }

  useEffect(() => {
    currentVideoIdRef.current = currentVideoId;
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
        height: "390",
        width: "100%",
        videoId: currentVideoIdRef.current,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
        },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: async (event) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              await skipQueueRef.current?.();
            }
          },
          onError: () => {
            setError(
              "This video could not be embedded. Try skipping to the next track."
            );
          },
        },
      });
    };

    setupPlayer();

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !playerRef.current || !currentVideoId) {
      return;
    }

    playerRef.current.loadVideoById(currentVideoId);
    setError("");
  }, [currentVideoId, isReady]);

  useEffect(() => {
    refreshQueue();

    const intervalId = window.setInterval(() => {
      refreshQueue();
    }, POLL_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, []);

  async function loadPlaylist() {
    setPlaylistStatus("Loading playlist...");
    setError("");

    try {
      const response = await fetch("/api/playlist", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Playlist request failed.");
      }

      const videos = Array.isArray(data.videos) ? data.videos : [];
      await fetch("/api/queue/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos }),
      });

      setPlaylistStatus(`Loaded ${videos.length} playlist items.`);
      await refreshQueue();
    } catch (loadError) {
      setPlaylistStatus("");
      setError(loadError.message || "Unable to load playlist.");
    }
  }

  async function playPrevious() {
    const previousIndex = queueState.currentIndex - 1;
    if (previousIndex < 0 || !queueState.queue[previousIndex]) {
      return;
    }

    try {
      await fetch("/api/queue/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: previousIndex }),
      });
      await refreshQueue();
    } catch {
      setError("Unable to jump to the previous song.");
    }
  }

  function playCurrent() {
    if (!playerRef.current || !currentVideoId) {
      return;
    }

    playerRef.current.playVideo();
  }

  async function addManualVideo() {
    const videoId = manualVideoId.trim();
    if (!videoId) {
      return;
    }

    try {
      await fetch("/api/queue/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video: {
            videoId,
            title: `Manual video ${videoId}`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          },
          requestedBy: "dashboard",
          source: "manual",
        }),
      });
      setManualVideoId("");
      await refreshQueue();
    } catch {
      setError("Unable to add the manual video.");
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,_#020617,_#0f172a_45%,_#111827)] px-6 py-8 text-white">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-200/80">
                Control Room
              </p>
              <h1 className="mt-2 text-3xl font-semibold">YouTube music player</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={playCurrent}
                className="rounded-full bg-cyan-300 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Play
              </button>
              <button
                onClick={skipQueue}
                className="rounded-full border border-white/15 px-5 py-2 font-semibold transition hover:bg-white/10"
              >
                Skip
              </button>
              <button
                onClick={playPrevious}
                className="rounded-full border border-white/15 px-5 py-2 font-semibold transition hover:bg-white/10"
              >
                Previous
              </button>
              <button
                onClick={loadPlaylist}
                className="rounded-full border border-cyan-400/50 px-5 py-2 font-semibold text-cyan-100 transition hover:bg-cyan-400/10"
              >
                Reload Playlist
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
            <div ref={containerRef} className="aspect-video w-full" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
                Now playing
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{currentTitle}</h2>
              <p className="mt-2 text-sm text-slate-400">
                Queue position {queueState.currentIndex + 1} of{" "}
                {Math.max(queueState.queue.length, 1)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="block text-sm font-medium text-slate-300">
                Add video by ID
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  value={manualVideoId}
                  onChange={(event) => setManualVideoId(event.target.value)}
                  placeholder="dQw4w9WgXcQ"
                  className="min-w-0 flex-1 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300"
                />
                <button
                  onClick={addManualVideo}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {(playlistStatus || error) && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {error || playlistStatus}
            </div>
          )}
        </section>

        <aside className="rounded-[2rem] border border-white/10 bg-white/8 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-pink-200/75">
                Queue
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Upcoming songs</h2>
            </div>
            <button
              onClick={refreshQueue}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {queueState.queue.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-slate-400">
                Load a playlist or use Twitch chat with `!sr`.
              </div>
            )}

            {queueState.queue.map((video, index) => {
              const isCurrent = index === queueState.currentIndex;

              return (
                <div
                  key={`${video.videoId}-${index}`}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isCurrent
                      ? "border-cyan-300/60 bg-cyan-300/10"
                      : "border-white/10 bg-slate-900/50"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    {isCurrent ? "Live now" : `Up next #${index + 1}`}
                  </p>
                  <p className="mt-2 font-medium text-white">{video.title}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Requested by {video.requestedBy || "system"}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </main>
  );
}
