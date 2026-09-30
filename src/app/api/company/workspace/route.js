import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SubCompany from "@/models/SubCompany";
import { signToken, verifyCompany } from "@/lib/auth";

// The Company account starts in group/read-only context. Selecting a workspace
// issues a new signed token, so transactional APIs keep their normal strict
// activeOperatingCompanyId checks instead of trusting a client-side filter.
export async function POST(req) {
  try {
    const admin = verifyCompany(req);
    if (admin.isGroupAdmin !== true) return NextResponse.json({ message: "JAYA GROUP administrator access is required." }, { status: 403 });
    const { operatingCompanyCode } = await req.json();
    if (!operatingCompanyCode) return NextResponse.json({ message: "Select an operating company." }, { status: 400 });
    await dbConnect();
    const operatingCompany = await SubCompany.findOne({
      companyId: admin.companyId,
      code: String(operatingCompanyCode).trim().toUpperCase(),
      isOperatingCompany: true,
      isActive: true,
    }).select("name code");
    if (!operatingCompany) return NextResponse.json({ message: "Selected company is unavailable." }, { status: 404 });
    const token = signToken(
      { _id: admin.companyId, companyId: admin.companyId, name: admin.name, email: admin.email, type: "company", accessAllOperatingCompanies: true },
      { activeOperatingCompany: operatingCompany, isGroupAdmin: true, groupName: "JAYA GROUP" }
    );
    return NextResponse.json({ token, activeOperatingCompany: { _id: operatingCompany._id, name: operatingCompany.name, code: operatingCompany.code } });
  } catch (error) {
    return NextResponse.json({ message: "Unable to select company workspace." }, { status: 401 });
  }
}
