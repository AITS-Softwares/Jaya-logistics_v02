import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDb from '@/lib/db';
import Customer from '@/models/CustomerModel';
import Supplier from '@/models/SupplierModels';
import Item from '@/models/ItemModels';
import { validateMasterDataRequest } from '@/lib/masterDataPermission';
import { duplicateMasterName } from '@/lib/masterNameUniqueness.mjs';

const resources = {
  customer: [Customer, 'Customers', 'customerName'],
  supplier: [Supplier, 'Suppliers', 'supplierName'],
  item: [Item, 'Items', 'itemName'],
};

export async function POST(req) {
  try {
    const { resource, name, excludeId } = await req.json();
    const config = Object.hasOwn(resources, resource) && resources[resource];
    if (!config || typeof name !== 'string' || !name.trim() || name.length > 500 || (excludeId && !mongoose.isValidObjectId(excludeId))) {
      return NextResponse.json({ success: false, message: 'Enter a valid name and resource.' }, { status: 400 });
    }
    const [Model, permission, field] = config;
    let access = await validateMasterDataRequest(req, 'create', permission);
    if (access.error && access.status === 403) access = await validateMasterDataRequest(req, 'edit', permission);
    if (access.error) return NextResponse.json({ success: false, message: access.error }, { status: access.status });
    await connectDb();
    const duplicate = await duplicateMasterName(Model, access.user.companyId, field, name, excludeId);
    return NextResponse.json({ success: true, duplicate }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, message: 'Unable to check this name. Please retry.' }, { status: 500 });
  }
}
