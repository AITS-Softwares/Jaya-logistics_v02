import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    success: false,
    code: "PIN_MANAGED_BY_DISPATCH",
    message: "Contact your dispatcher to reset your driver PIN.",
  }, { status: 403 });
}
