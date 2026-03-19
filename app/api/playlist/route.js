import { NextResponse } from "next/server";
import { fetchPlaylistVideos } from "@/lib/youtube";

export async function GET() {
  try {
    const videos = await fetchPlaylistVideos();
    return NextResponse.json({ videos });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch playlist." },
      { status: 500 }
    );
  }
}
