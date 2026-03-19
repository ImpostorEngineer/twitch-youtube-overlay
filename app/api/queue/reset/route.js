import { NextResponse } from "next/server";
import { resetQueue } from "@/lib/queue";
import { assertRoomToken } from "@/lib/rooms";

export async function POST(request) {
  try {
    const body = await request.json();
    assertRoomToken(body.roomId, body.token);
    return NextResponse.json(
      resetQueue(body.roomId, body.videos || [], {
        playlistUrl: body.playlistUrl,
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to reset queue." },
      { status: 400 }
    );
  }
}
