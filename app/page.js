import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.2),_transparent_35%),linear-gradient(135deg,_#0f172a,_#020617_65%)] px-6 py-16 text-white">
      <div className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl shadow-black/30 backdrop-blur md:p-12">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">
          Twitch + YouTube + OBS
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
          Local music requests with a player dashboard and stream overlay.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
          Use the control room to load a playlist, watch the queue update live,
          and point OBS at the overlay route for now-playing text.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/player"
            className="rounded-full bg-cyan-300 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Open Player
          </Link>
          <Link
            href="/overlay"
            className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10"
          >
            Open Overlay
          </Link>
        </div>
      </div>
    </main>
  );
}
