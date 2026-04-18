import { NextResponse } from "next/server";
import { loadWeeklySignals } from "@/lib/signals";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const bundle = await loadWeeklySignals();
  return NextResponse.json(bundle);
}
