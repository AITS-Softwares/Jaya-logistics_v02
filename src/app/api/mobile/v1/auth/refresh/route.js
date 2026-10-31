import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { isDriverMobileEnabled, mobileRefreshFailureCode, mobileUnavailableResponse, rotateMobileSession } from "@/lib/driverMobileAuth";

export async function POST(req) {
  if (!(await isDriverMobileEnabled())) return mobileUnavailableResponse();
  try {
    const { refreshToken } = await req.json();
    await dbConnect();
    const session = await rotateMobileSession(refreshToken);
    if (!session) {
      const reason = await mobileRefreshFailureCode(refreshToken);
      if (reason === "DEVICE_MOVED") return NextResponse.json({ success: false, code: reason, message: "This account is now active on another phone. Request approval again only if you are using the assigned phone." }, { status: 403 });
      if (reason === "DEVICE_RELEASED") return NextResponse.json({ success: false, code: reason, message: "This phone was released by dispatch. Sign in again only if dispatch has assigned this phone to you." }, { status: 403 });
      if (reason === "DEVICE_REASSIGNED") return NextResponse.json({ success: false, code: reason, message: "This phone is now linked to another driver. Ask dispatch to release it before using it for your account." }, { status: 403 });
      return NextResponse.json({ success: false, code: "INVALID_REFRESH", message: "The refresh session is invalid or no longer active." }, { status: 401 });
    }
    return NextResponse.json({ success: true, data: { accessToken: session.accessToken, refreshToken: session.refreshToken, expiresInSeconds: session.expiresInSeconds } });
  } catch (error) {
    console.error("mobile auth refresh:", error.message);
    return NextResponse.json({ success: false, code: "REFRESH_FAILED", message: "Unable to refresh the session." }, { status: 500 });
  }
}
