import { NextResponse } from "next/server";
import { addToQueue } from "@/lib/queue";
import { assertRoomToken } from "@/lib/rooms";
import { extractVideoId, fetchVideoDetails } from "@/lib/youtube";

export async function POST(request) {
  try {
    const body = await request.json();
    assertRoomToken(body.roomId, body.token);
    let video = body.video;

    if (!video && body.input) {
      const videoId = extractVideoId(body.input);

      if (!videoId) {
        throw new Error("Enter a valid YouTube video ID or URL.");
      }

      video = await fetchVideoDetails(videoId);

      if (!video) {
        throw new Error("Unable to find that YouTube video.");
      }
    }

    const result = addToQueue(body.roomId, video, {
      requestedBy: body.requestedBy,
      source: body.source,
      insertAfterCurrent: body.insertAfterCurrent ?? true,
    });

    return NextResponse.json(result, { status: result.added ? 201 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to add to queue." },
      { status: 400 }
    );
  }
}
