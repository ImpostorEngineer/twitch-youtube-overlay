import { NextResponse } from "next/server";
import { resetQueue } from "@/lib/queue";

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(resetQueue(body.videos || []));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to reset queue." },
      { status: 400 }
    );
  }
}
