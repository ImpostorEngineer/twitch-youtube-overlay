import { NextResponse } from "next/server";
import { skip } from "@/lib/queue";

export async function POST() {
  return NextResponse.json(skip());
}
