import { loadEnvConfig } from '@next/env';
import { MongoClient } from 'mongodb';

loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
const client = new MongoClient(process.env.MONGODB_URI);
const collation = { locale: 'en', strength: 2 };
const masters = [
  ['items', 'itemName', 'item'],
  ['suppliers', 'supplierName', 'supplier'],
  ['customers', 'customerName', 'customer'],
];

try {
  await client.connect();
  const db = client.db();
  let blocked = false;
  for (const [collection, field] of masters) {
    const duplicates = await db.collection(collection).aggregate([
      { $group: { _id: { companyId: '$companyId', name: `$${field}` }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ], { collation }).toArray();
    const missing = await db.collection(collection).countDocuments({
      $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: /^\s*$/ }],
    });
    console.log(`${collection}: ${duplicates.length} duplicate name groups; ${missing} missing/blank names.`);
    if (duplicates.length || missing) blocked = true;
  }
  if (blocked) {
    throw new Error('Resolve duplicate and missing names before creating indexes. No records were changed.');
  }
  if (process.argv.includes('--apply')) {
    for (const [collection, field, label] of masters) {
      await db.collection(collection).createIndex({ companyId: 1, [field]: 1 }, {
        unique: true, name: `unique_${label}_name_per_company`, collation,
      });
      console.log(`Created unique name index for ${collection}.`);
    }
  } else {
    console.log('Audit passed. Run again with --apply to create the indexes.');
  }
} finally {
  await client.close();
}
