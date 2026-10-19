// src/lib/billedLrs.js
// LR numbers that already appear in a saved bill of the given type for this company.
// Each billing type is tracked on its own: "product-wise" (Yara) and "general" do not affect each other.
import mongoose from "mongoose";

export async function getBilledLrNumbers(companyId, type = "product-wise") {
    const set = new Set();
    const col = mongoose.connection.collection("savedreports");
    const cursor = col.find(
        { companyId: new mongoose.Types.ObjectId(String(companyId)), type },
        { projection: { "data.lrNo": 1 } }
    );
    for await (const doc of cursor) {
        (doc.data || []).forEach((row) => { if (row?.lrNo) set.add(row.lrNo); });
    }
    return set;
}