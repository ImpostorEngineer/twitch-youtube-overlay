import { NextResponse } from "next/server";
import { shuffleQueue } from "@/lib/queue";
import { assertRoomToken } from "@/lib/rooms";

export async function POST(request) {
  try {
    const body = await request.json();
    assertRoomToken(body.roomId, body.token);
    return NextResponse.json(shuffleQueue(body.roomId));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to shuffle the queue." },
      { status: 400 }
    );
  }
}
