import { NextResponse } from "next/server";
import { addToQueue } from "@/lib/queue";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = addToQueue(body.video, {
      requestedBy: body.requestedBy,
      source: body.source,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to add to queue." },
      { status: 400 }
    );
  }
}
