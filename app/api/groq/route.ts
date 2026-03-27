import { NextRequest, NextResponse } from "next/server";
import { extractIntent } from "@/lib/groq";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const result = await extractIntent(message);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "Groq Intent API",
    timestamp: new Date().toISOString(),
  });
}
