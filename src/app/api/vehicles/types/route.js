import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { VEHICLE_TYPE_OPTIONS, vehicleTypeKey } from "@/lib/vehicleTypes";

const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
}, { timestamps: true });
schema.index({ companyId: 1, key: 1 }, { unique: true });
const VehicleType = mongoose.models.VehicleType || mongoose.model("VehicleType", schema);

export async function GET(req) {
  const { user, error, status } = await validateMasterDataRequest(req, "view", "Vehicles");
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  await connectDb();
  const types = await VehicleType.find({ companyId: user.companyId }).select("name").sort({ name: 1 }).lean();
  return NextResponse.json({ success: true, data: types.map(type => type.name) });
}

export async function POST(req) {
  const { user, error, status } = await validateMasterDataRequest(req, "create", "Vehicles");
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > 80 || name === "__create_vehicle_type__") {
    return NextResponse.json({ success: false, message: "Enter a vehicle type name of 1 to 80 characters." }, { status: 400 });
  }
  const key = vehicleTypeKey(name);
  const builtIn = VEHICLE_TYPE_OPTIONS.find(option => vehicleTypeKey(option) === key);
  if (builtIn) return NextResponse.json({ success: true, data: builtIn });

  await connectDb();
  const filter = { companyId: user.companyId, key };
  let type;
  try {
    type = await VehicleType.findOneAndUpdate(filter, { $setOnInsert: { name } }, { upsert: true, new: true }).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    type = await VehicleType.findOne(filter).lean();
    if (!type) throw error;
  }
  return NextResponse.json({ success: true, data: type.name });
}
