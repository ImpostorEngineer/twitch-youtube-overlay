import { NextResponse } from "next/server";
import { ensureTwitchService } from "@/lib/twitch";
import { getQueueState } from "@/lib/queue";

export async function GET() {
  ensureTwitchService();
  return NextResponse.json(getQueueState());
}
