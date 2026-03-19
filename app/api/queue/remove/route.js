import { NextResponse } from "next/server";
import { removeFromQueue } from "@/lib/queue";
import { assertRoomToken } from "@/lib/rooms";

export async function POST(request) {
  try {
    const body = await request.json();
    assertRoomToken(body.roomId, body.token);
    return NextResponse.json(removeFromQueue(body.roomId, body.index));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to remove the queued song." },
      { status: 400 }
    );
  }
}
