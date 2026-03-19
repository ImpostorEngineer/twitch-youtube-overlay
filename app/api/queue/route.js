import { NextResponse } from "next/server";
import { ensureTwitchService } from "@/lib/twitch";
import { getRoom } from "@/lib/rooms";
import { getQueueState } from "@/lib/queue";

export async function GET(request) {
  ensureTwitchService();
  const roomId = new URL(request.url).searchParams.get("roomId");

  if (!getRoom(roomId)) {
    return NextResponse.json({ error: "Unknown room." }, { status: 404 });
  }

  return NextResponse.json(getQueueState(roomId));
}
