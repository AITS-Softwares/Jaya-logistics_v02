import { NextResponse } from "next/server";

// Deliberately unauthenticated: this is a minimal synthetic-health endpoint
// for the dedicated driver hostname/reverse proxy. It exposes no user, trip,
// database, or configuration data.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      success: true,
      service: "driver-mobile",
      status: "healthy",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
