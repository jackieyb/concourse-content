import { NextResponse } from "next/server";
import { getWeeklySignals } from "@/lib/signals";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getWeeklySignals());
}
