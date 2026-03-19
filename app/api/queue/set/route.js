import { NextResponse } from "next/server";
import { setCurrentIndex } from "@/lib/queue";
import { assertRoomToken } from "@/lib/rooms";

export async function POST(request) {
  try {
    const body = await request.json();
    assertRoomToken(body.roomId, body.token);
    return NextResponse.json(setCurrentIndex(body.roomId, body.index));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update current track." },
      { status: 400 }
    );
  }
}
