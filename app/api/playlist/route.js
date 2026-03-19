import { NextResponse } from "next/server";
import { assertRoomToken } from "@/lib/rooms";
import { extractPlaylistId, fetchPlaylistVideos } from "@/lib/youtube";
import { getPlaylistUrl, resetQueue, setPlaylistUrl } from "@/lib/queue";

export async function POST(request) {
  try {
    const body = await request.json();
    assertRoomToken(body.roomId, body.token);

    const nextPlaylistUrl =
      typeof body.playlistUrl === "string" ? body.playlistUrl.trim() : "";
    const playlistUrl = nextPlaylistUrl || getPlaylistUrl(body.roomId);

    if (!playlistUrl) {
      throw new Error("Paste a YouTube playlist URL before loading.");
    }

    const playlistId = extractPlaylistId(playlistUrl);

    if (!playlistId) {
      throw new Error("Enter a valid YouTube playlist URL.");
    }

    const videos = await fetchPlaylistVideos(playlistId);
    setPlaylistUrl(body.roomId, playlistUrl);
    const queueState = resetQueue(body.roomId, videos, { playlistUrl });

    return NextResponse.json({
      videos,
      ...queueState,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch playlist." },
      { status: 400 }
    );
  }
}
