"use client";

import { useEffect, useRef } from "react";

function getQueueThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/default.jpg`;
}

export default function Queue({
  queue,
  currentIndex,
  isRefreshing,
  onPlayItem,
  onRemoveItem,
  onRefresh,
  onShuffle,
}) {
  const currentItemRef = useRef(null);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentIndex]);

  return (
    <aside className="relative z-20 w-full max-w-[36rem] rounded-[2rem] border border-white/10 bg-slate-900/95 p-5 shadow-2xl shadow-slate-950/30 lg:justify-self-end xl:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-pink-200/75">
            Queue
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Upcoming songs</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShuffle}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            Shuffle
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="queue-scroll mt-5 grid max-h-[54vh] gap-3 overflow-x-hidden overflow-y-auto rounded-[1.5rem] bg-slate-900">
        {queue.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center text-slate-400">
            Load a playlist or use Twitch chat with `!sr`.
          </div>
        )}

        {queue.map((video, index) => {
          const isCurrent = index === currentIndex;

          return (
            <div
              key={`${video.videoId}-${index}`}
              ref={isCurrent ? currentItemRef : null}
              className={`group relative rounded-2xl border transition ${
                isCurrent
                  ? "border-cyan-300/60 bg-cyan-300/10"
                  : "border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/80"
              }`}
            >
              <button
                onClick={() => onPlayItem(index)}
                className="flex w-full items-center gap-3 px-3 py-3 pr-12 text-left"
              >
                <img
                  src={video.thumbnail || getQueueThumbnail(video.videoId)}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                    {isCurrent ? "Live now" : `Play next #${index + 1}`}
                  </p>
                  <p className="mt-1 line-clamp-2 break-words font-medium leading-6 text-white">
                    {video.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                    Requested by {video.requestedBy || "system"}
                  </p>
                </div>
              </button>

              <button
                onClick={() => onRemoveItem(index)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:border-rose-300/40 hover:text-rose-200"
                aria-label={`Remove ${video.title}`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
