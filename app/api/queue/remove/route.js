import { NextResponse } from "next/server";
import { removeFromQueue } from "@/lib/queue";

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(removeFromQueue(body.index));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to remove the queued song." },
      { status: 400 }
    );
  }
}
