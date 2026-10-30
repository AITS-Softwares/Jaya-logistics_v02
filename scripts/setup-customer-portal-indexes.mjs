// Run manually against the intended deployment database after reviewing its connection setting.
// node --env-file=.env --env-file=.env.local scripts/setup-customer-portal-indexes.mjs
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI for the intended deployment database.');
await mongoose.connect(process.env.MONGODB_URI);
try {
  const db = mongoose.connection.db;
  await db.collection('customerusers').createIndex({ email: 1 }, { unique: true });
  await db.collection('customerusers').createIndex({ companyId: 1 });
  await db.collection('customerusers').createIndex({ customerId: 1 });
  await db.collection('portalloginattempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('orderpanels').createIndex({ companyId: 1, customerId: 1, subCompanyId: 1, date: -1 });
  console.log('Customer portal indexes are ready. No records were changed or deleted.');
} finally {
  await mongoose.disconnect();
}
