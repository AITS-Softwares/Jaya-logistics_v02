import mongoose from 'mongoose';

// Run with: node --env-file=.env.local scripts/migrate-order-cancellation-charges.mjs
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI must be configured before running the migration.');

await mongoose.connect(uri);
try {
  const db = mongoose.connection.db;
  const orders = db.collection('orderpanels');
  const legacy = await orders.updateMany(
    { cancellationCharges: { $in: ['Nil', '', null] } },
    { $set: { cancellationCharges: 0, cancellationChargeMode: 'flat' } },
  );
  const rows = await orders.updateMany(
    { 'plantRows.cancellationCharges': { $in: ['Nil', '', null] } },
    [{ $set: { plantRows: { $map: { input: '$plantRows', as: 'row', in: { $mergeObjects: ['$$row', {
      cancellationCharges: { $cond: [{ $in: ['$$row.cancellationCharges', ['Nil', '', null]] }, 0, '$$row.cancellationCharges'] },
      cancellationChargeMode: { $ifNull: ['$$row.cancellationChargeMode', 'flat'] },
    }] } } } } }],
  );
  console.log(`Migrated ${legacy.modifiedCount} order headers and ${rows.modifiedCount} order documents containing legacy row values.`);
} finally {
  await mongoose.disconnect();
}
