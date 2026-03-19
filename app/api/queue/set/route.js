import { NextResponse } from "next/server";
import { setCurrentIndex } from "@/lib/queue";

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(setCurrentIndex(body.index));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to update current track." },
      { status: 400 }
    );
  }
}
