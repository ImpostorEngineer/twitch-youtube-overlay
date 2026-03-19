import { NextResponse } from "next/server";
import { skip } from "@/lib/queue";
import { assertRoomToken } from "@/lib/rooms";

export async function POST(request) {
  try {
    const body = await request.json();
    assertRoomToken(body.roomId, body.token);
    return NextResponse.json(skip(body.roomId));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to skip the current song." },
      { status: 400 }
    );
  }
}
