import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import { validateMasterDataRequest } from "@/lib/masterDataPermission";
import { syncItem } from "@/lib/frappe-item.mjs";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await dbConnect();
    const { user, error, status } = await validateMasterDataRequest(req, 'create', "Items");
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const body = await req.json().catch(() => ({}));
    const itemId = String(body.itemId || "").trim();
    const offset = Math.max(0, Number.parseInt(body.offset, 10) || 0);
    const batchSize = Math.min(25, Math.max(1, Number.parseInt(body.batchSize, 10) || 10));
    const filter = { companyId: user.companyId, ...(itemId ? { _id: itemId } : {}) };
    const [total, items] = await Promise.all([
      Item.countDocuments(filter),
      Item.find(filter).sort({ _id: 1 }).skip(itemId ? 0 : offset).limit(itemId ? 1 : batchSize),
    ]);

    const summary = { processed: items.length, synced: 0, failed: 0, notConfigured: 0 };
    const failures = [];
    for (const item of items) {
      const frappeSync = await syncItem(item);
      await Item.updateOne(
        { _id: item._id, companyId: user.companyId },
        { $set: { frappeSync: { ...frappeSync, attemptedAt: new Date() } } }
      );

      if (frappeSync.status === 'synced') summary.synced += 1;
      else if (frappeSync.status === 'not_configured') summary.notConfigured += 1;
      else {
        summary.failed += 1;
        failures.push({ itemCode: item.itemCode, message: frappeSync.message });
      }
    }

    const nextOffset = offset + items.length;
    return NextResponse.json({ success: true, total, summary, failures, nextOffset: itemId ? null : (nextOffset < total ? nextOffset : null) });
  } catch (error) {
    console.error('POST /items/sync error:', error);
    return NextResponse.json({ success: false, message: 'Failed to sync items' }, { status: 500 });
  }
}
