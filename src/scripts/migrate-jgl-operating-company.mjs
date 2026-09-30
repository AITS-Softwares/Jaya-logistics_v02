/*
 * Safe historical-scope migration. It never changes primary document numbers:
 * relationships in this ERP still use several of those values as text. Instead
 * it stamps JGL ownership and adds an immutable companyDocumentNumber while
 * retaining legacyDocumentNumber. Run dry-run first; --apply is required to
 * write anything.
 *
 * Usage:
 *   node src/scripts/migrate-jgl-operating-company.mjs --company-id <ObjectId>
 *   node src/scripts/migrate-jgl-operating-company.mjs --company-id <ObjectId> --apply
 */
import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI;
const args = new Set(process.argv.slice(2));
const companyIdArg = process.argv[process.argv.indexOf("--company-id") + 1];
const apply = args.has("--apply");

if (!uri || !companyIdArg || !ObjectId.isValid(companyIdArg)) {
  console.error("Usage: MONGODB_URI=... node src/scripts/migrate-jgl-operating-company.mjs --company-id <ObjectId> [--apply]");
  process.exit(1);
}

const companyId = new ObjectId(companyIdArg);
const targets = [
  { collection: "orderpanels", number: "orderPanelNo", type: "ORD" },
  { collection: "vehiclenegotiations", number: "vnnNo", type: "VNN" },
  { collection: "pricingpanels", number: "pricingSerialNo", type: "PRC" },
  { collection: "loadingpanels", number: "vehicleArrivalNo", type: "LOD" },
  { collection: "purchasepanels", number: "purchaseNo", type: "PUR" },
  { collection: "consignmentnotes", number: "lrNo", type: "LR" },
  { collection: "pods", number: "podNo", type: "POD" },
  { collection: "advancepayments", number: "paymentNo", type: "ADV" },
  { collection: "balancepayments", number: "balancePaymentNo", type: "BLP" },
];

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db();
  const jgl = await db.collection("subcompanies").findOne({ companyId, code: "JGL", isOperatingCompany: true, isActive: true });
  if (!jgl) throw new Error("Active JGL operating company was not found for this parent company.");

  const collections = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(({ name }) => name));
  const report = { companyId: companyId.toString(), jglId: jgl._id.toString(), mode: apply ? "APPLY" : "DRY RUN", collections: [] };
  for (const target of targets) {
    if (!collections.has(target.collection)) continue;
    const collection = db.collection(target.collection);
    const filter = { companyId, $or: [{ subCompanyId: { $exists: false } }, { subCompanyId: null }] };
    const count = await collection.countDocuments(filter);
    report.collections.push({ collection: target.collection, candidates: count });
    if (!apply || count === 0) continue;

    const cursor = collection.find(filter, { projection: { _id: 1, [target.number]: 1 } });
    const operations = [];
    for await (const record of cursor) {
      const oldNumber = String(record[target.number] || record._id);
      operations.push({
        updateOne: {
          filter: { _id: record._id, $or: [{ subCompanyId: { $exists: false } }, { subCompanyId: null }] },
          update: {
            $set: {
              subCompanyId: jgl._id,
              subCompanyName: "Jaya Global Logistics",
              subCompanyCode: "JGL",
              companyDocumentNumber: `JGL-${target.type}-${oldNumber}`,
              legacyDocumentNumber: oldNumber,
              migration: { name: "jgl-operating-company-v1", migratedAt: new Date() },
            },
          },
        },
      });
      if (operations.length === 500) { await collection.bulkWrite(operations, { ordered: true }); operations.length = 0; }
    }
    if (operations.length) await collection.bulkWrite(operations, { ordered: true });
  }
  const legacyUsers = await db.collection("companyusers").countDocuments({ companyId, accessAllOperatingCompanies: { $ne: true }, $or: [{ operatingCompanyIds: { $exists: false } }, { operatingCompanyIds: { $size: 0 } }] });
  report.legacyUsersAssignedToJgl = legacyUsers;
  if (apply && legacyUsers) {
    await db.collection("companyusers").updateMany(
      { companyId, accessAllOperatingCompanies: { $ne: true }, $or: [{ operatingCompanyIds: { $exists: false } }, { operatingCompanyIds: { $size: 0 } }] },
      { $set: { operatingCompanyIds: [jgl._id], defaultOperatingCompanyId: jgl._id, accessAllOperatingCompanies: false } }
    );
  }
  if (apply) await db.collection("migrationaudits").insertOne({ ...report, completedAt: new Date() });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
}
