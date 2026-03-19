import { NextResponse } from "next/server";
import { shuffleQueue } from "@/lib/queue";

export async function POST() {
  return NextResponse.json(shuffleQueue());
}
