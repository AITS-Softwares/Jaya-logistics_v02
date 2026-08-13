import { NextResponse } from "next/server";
import { OPERATING_COMPANY_SEEDS } from "@/lib/companyScope";

// The selection list is intentionally static until the client confirms a
// company-administration workflow. Login itself verifies the selection against
// the signed-in user's parent tenant, so this endpoint exposes no tenant data.
export async function GET() {
  return NextResponse.json({
    success: true,
    data: OPERATING_COMPANY_SEEDS.map(({ code, name }) => ({ code, name })),
  });
}
