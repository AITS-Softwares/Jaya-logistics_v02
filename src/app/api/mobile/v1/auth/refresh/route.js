import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { isDriverMobileEnabled, mobileUnavailableResponse, rotateMobileSession } from "@/lib/driverMobileAuth";

export async function POST(req) {
  if (!isDriverMobileEnabled()) return mobileUnavailableResponse();
  try {
    const { refreshToken } = await req.json();
    await dbConnect();
    const session = await rotateMobileSession(refreshToken);
    if (!session) return NextResponse.json({ success: false, code: "INVALID_REFRESH", message: "The refresh session is invalid or no longer active." }, { status: 401 });
    return NextResponse.json({ success: true, data: { accessToken: session.accessToken, refreshToken: session.refreshToken, expiresInSeconds: session.expiresInSeconds } });
  } catch (error) {
    console.error("mobile auth refresh:", error.message);
    return NextResponse.json({ success: false, code: "REFRESH_FAILED", message: "Unable to refresh the session." }, { status: 500 });
  }
}
