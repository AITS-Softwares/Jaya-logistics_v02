import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import SubCompany from "@/models/SubCompany";

const TRANSACTION_COLLECTIONS = ["orderpanels", "vehiclenegotiations", "pricingpanels", "loadingpanels", "purchasepanels", "consignmentnotes", "pods", "advancepayments", "balancepayments"];

export async function GET(req) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = token && jwt.verify(token, process.env.JWT_SECRET);
    if (!user || user.type !== "company" || user.isGroupAdmin !== true) {
      return NextResponse.json({ message: "JAYA GROUP administrator access is required." }, { status: 403 });
    }
    await dbConnect();
    const companies = await SubCompany.find({ companyId: user.companyId, isOperatingCompany: true, isActive: true }).select("name code").lean();
    const collectionNames = new Set((await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
    const rows = [];
    for (const company of companies) {
      const counts = {};
      for (const collectionName of TRANSACTION_COLLECTIONS) {
        counts[collectionName] = collectionNames.has(collectionName)
          ? await mongoose.connection.db.collection(collectionName).countDocuments({ companyId: new mongoose.Types.ObjectId(user.companyId), subCompanyId: company._id })
          : 0;
      }
      rows.push({ code: company.code, name: company.name, total: Object.values(counts).reduce((sum, count) => sum + count, 0), counts });
    }
    return NextResponse.json({ groupName: "JAYA GROUP", companies: rows });
  } catch (error) {
    return NextResponse.json({ message: "Unable to load group overview." }, { status: 500 });
  }
}
