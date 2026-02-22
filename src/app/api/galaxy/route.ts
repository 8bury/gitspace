import { NextResponse } from "next/server";
import { getAllEntries } from "@/lib/galaxyStore";

export async function GET() {
  try {
    const entries = await getAllEntries();
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[Galaxy API]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
