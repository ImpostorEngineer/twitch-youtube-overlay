import Link from "next/link";
import { getRooms } from "@/lib/rooms";

function getRoomInitials(name) {
  return name
    .split(/[\s_-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RoomCard({ room }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="flex items-center gap-4">
        {room.logoUrl ? (
          <img
            src={room.logoUrl}
            alt={`${room.name} logo`}
            className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(34,211,238,0.32),_rgba(15,23,42,0.95))] text-sm font-semibold uppercase tracking-[0.18em] text-cyan-50 ring-1 ring-white/10">
            {getRoomInitials(room.name)}
          </div>
        )}
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">
            Twitch Room
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{room.name}</h2>
          <p className="mt-2 text-sm text-slate-400">@{room.id}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/room/${room.id}`}
          className="rounded-full bg-cyan-300 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-cyan-200"
        >
          Open Player
        </Link>
        <Link
          href={`/overlay/${room.id}`}
          className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white transition hover:bg-white/10"
        >
          Open Overlay
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const rooms = getRooms();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.2),_transparent_35%),linear-gradient(135deg,_#0f172a,_#020617_65%)] px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl shadow-black/30 backdrop-blur md:p-12">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">
            Twitch + YouTube + OBS
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Shared music rooms with a player dashboard and stream overlay.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
            Each room has its own queue, current song, and overlay link. Open a
            room to control playback or point OBS at its overlay route.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </div>
    </main>
  );
}
