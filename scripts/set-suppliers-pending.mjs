// Run from the project directory. Preview by default; --apply performs writes.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const mongoose = require('mongoose');

export function pendingSupplierUpdate(record, makerId, reason, at = new Date(), makerType = 'companyUser') {
  if (!['company', 'companyUser'].includes(makerType)) throw new Error('Maker type must be company or companyUser.');
  if (record.isDeleted || record.pendingChange || ![undefined, null, 'Approved'].includes(record.approvalStatus)) return null;
  if (record.reservedSupplierCode && record.reservedSupplierCode !== record.supplierCode) return null;
  const by = { accountType: makerType, accountId: new mongoose.Types.ObjectId(makerId) };
  const revisionId = randomUUID();
  return {
    $set: { approvalStatus: 'Pending', revisionId, submittedBy: by, submittedAt: at,
      approvalVersion: Number(record.approvalVersion) || 0, pendingChange: null,
      rejectionReason: '', lastRejectedProposal: null, updatedAt: at,
      ...(record.supplierCode ? { reservedSupplierCode: record.supplierCode } : {}) },
    $unset: { approvedBy: '', approvedAt: '', rejectedBy: '', rejectedAt: '' },
    $push: { approvalLog: { action: 'SUBMITTED', revisionId, by, at, changedFields: [],
      remark: `${reason} Previous approval status: ${record.approvalStatus || 'not configured'}. Existing supplier details retained.` } },
  };
}

export async function resolveSupplierMaker(db, companyId, makerId, requestedType) {
  const accountType = requestedType || (String(makerId) === String(companyId) ? 'company' : 'companyUser');
  if (!['company', 'companyUser'].includes(accountType)) throw new Error('--maker-type must be company or companyUser.');
  const company = new mongoose.Types.ObjectId(companyId), accountId = new mongoose.Types.ObjectId(makerId);
  if (accountType === 'company') {
    if (!company.equals(accountId)) throw new Error('A company maker ID must match the selected company ID.');
    const account = await db.collection('companies').findOne({ _id: accountId, isActive: { $ne: false }, isDeleted: { $ne: true } });
    if (!account) throw new Error('Company maker was not found or is inactive in the selected database.');
  } else {
    const maker = await db.collection('companyusers').findOne({ _id: accountId, companyId: company, isActive: { $ne: false } });
    if (!maker) throw new Error('Maker must be an active CompanyUser in the selected company, or use the company account as maker.');
    const supplierModule = maker.modules?.Suppliers;
    if (!maker.roles?.includes('Admin') && !(supplierModule?.selected && (supplierModule.permissions?.create || supplierModule.permissions?.edit))) throw new Error('Maker needs Suppliers create/edit permission (or Admin role). Choose the submitter, not the approver.');
  }
  return { accountType, accountId };
}

export async function main(args = process.argv.slice(2)) {
  const usage = 'node scripts/set-suppliers-pending.mjs --db=DATABASE --company-id=COMPANY_ID --maker-id=MAKER_ACCOUNT_ID [--maker-type=company|companyUser] [--supplier-codes=CODE1,CODE2] [--apply]';
  if (args.includes('--help')) { console.log(usage); return; }
  const names = ['db', 'company-id', 'maker-id', 'maker-type', 'supplier-codes', 'reason', 'backup'];
  if (args.some(arg => arg !== '--apply' && !names.some(name => arg.startsWith(`--${name}=`)))) throw new Error(`Unknown option. Usage: ${usage}`);
  for (const name of names) if (args.filter(arg => arg.startsWith(`--${name}=`)).length > 1) throw new Error(`Specify --${name} once.`);
  const option = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const database = option('db'), companyId = option('company-id'), makerId = option('maker-id');
  if (!database || !/^[a-f\d]{24}$/i.test(companyId || '') || !/^[a-f\d]{24}$/i.test(makerId || '')) throw new Error(`Specify the exact database and valid company/maker IDs. Usage: ${usage}`);
  if (option('supplier-codes') !== undefined && !option('supplier-codes').trim()) throw new Error('--supplier-codes must not be empty.');
  if (option('maker-type') !== undefined && !['company', 'companyUser'].includes(option('maker-type'))) throw new Error('--maker-type must be company or companyUser.');
  require('@next/env').loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', { info() {}, error() {} });
  const uri = process.env.MASTER_APPROVAL_MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('Configure MONGODB_URI in the project environment.');
  const apply = args.includes('--apply'), company = new mongoose.Types.ObjectId(companyId);
  try {
    await mongoose.connect(uri, { dbName: database, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    const db = mongoose.connection.db;
    const maker = await resolveSupplierMaker(db, companyId, makerId, option('maker-type'));
    const collection = db.collection('suppliers');
    const codes = option('supplier-codes')?.split(',').map(code => code.trim()).filter(Boolean);
    const filter = { companyId: company, ...(codes ? { supplierCode: { $in: codes } } : {}) };
    const fields = ['approvalStatus', 'approvalVersion', 'revisionId', 'submittedBy', 'submittedAt', 'approvedBy', 'approvedAt', 'rejectedBy', 'rejectedAt', 'rejectionReason', 'lastRejectedProposal', 'pendingChange', 'reservedSupplierCode', 'updatedAt', 'approvalLog'];
    const records = await collection.find(filter, { projection: Object.fromEntries(['_id', 'companyId', 'supplierCode', 'isDeleted', ...fields].map(field => [field, 1])) }).toArray();
    const reason = option('reason')?.trim() || 'Existing supplier submitted for individual approver review.';
    const plan = records.map(record => ({ record, update: pendingSupplierUpdate(record, makerId, reason, new Date(), maker.accountType) })).filter(item => item.update);
    console.log(`Database: ${database}; company: ${companyId}; mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
    console.log(`Maker account: ${maker.accountType} ${makerId}`);
    console.log(`Matched: ${records.length}; move to Pending: ${plan.length}; skipped: ${records.length - plan.length}`);
    console.log(`Eligible supplier codes (first 20): ${plan.slice(0, 20).map(item => item.record.supplierCode || String(item.record._id)).join(', ') || 'none'}`);
    console.log('Pending/rejected/deleted records, existing change proposals and conflicting code reservations are skipped.');
    if (!apply || !plan.length) return;
    const backup = path.resolve(option('backup') || `outputs/supplier-approval-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.writeFileSync(backup, plan.map(({ record }) => JSON.stringify(record)).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
    console.log(`Approval-metadata backup: ${backup}`);
    let changed = 0, conflicts = 0;
    for (const { record, update } of plan) {
      const guard = { _id: record._id, companyId: company, isDeleted: { $ne: true }, pendingChange: null };
      // Do not overwrite an edit or review made after this script's preview read.
      for (const field of ['updatedAt', 'approvalStatus', 'approvalVersion', 'revisionId', 'reservedSupplierCode']) guard[field] = Object.hasOwn(record, field) ? record[field] : { $exists: false };
      const result = await collection.updateOne(guard, update);
      if (result.modifiedCount === 1) changed++; else conflicts++;
    }
    console.log(`Moved to Pending: ${changed}; concurrent changes skipped: ${conflicts}.`);
    console.log('Approver: open Supplier Master and filter Pending. The submitting maker cannot approve their own submission.');
    console.log('Pending suppliers will be excluded from new transaction supplier lookups until approved. No external sync or notification was sent.');
  } finally { await mongoose.disconnect(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.name === 'Error' ? error.message : `Supplier update failed (${error.name}). Check the connection and rerun the preview.`); process.exitCode = 1; });
}
