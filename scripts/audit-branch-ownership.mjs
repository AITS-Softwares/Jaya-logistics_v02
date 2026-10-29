// Read-only audit. Does not change users, approval state, or transaction data.
import { createRequire } from 'node:module';
import { MongoClient, ObjectId } from 'mongodb';
import { branchModels, key, makeOwnershipResolver } from '../src/lib/branchOwnership.mjs';

const require = createRequire(import.meta.url);
if (process.argv.includes('--help')) {
  console.log('node scripts/audit-branch-ownership.mjs [--company-id <ObjectId>]\nRead-only report of unresolved and mixed-branch ownership, by operating company.');
  process.exit(0);
}
require('@next/env').loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI) throw Error('MONGODB_URI is required.');
const argIndex = process.argv.indexOf('--company-id');
const companyId = argIndex >= 0 ? process.argv[argIndex + 1] : null;
if (companyId && !ObjectId.isValid(companyId)) throw Error('Invalid --company-id.');
const pluralize = require('mongoose').pluralize();
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
await client.connect();
try {
  const db = client.db();
  const companies = companyId ? [new ObjectId(companyId)] : await db.collection('branches').distinct('companyId');
  const report = [];
  for (const tenantId of companies) {
    const branches = await db.collection('branches').find({ companyId: tenantId }).toArray();
    const operatingCompanies = await db.collection('subcompanies').find({ companyId: tenantId, isOperatingCompany: true }).toArray();
    for (const op of operatingCompanies) {
      const rows = new Map();
      const indices = new Map();
      for (const [name, spec] of Object.entries(branchModels)) {
        if (['TrackingSession', 'LocationPoint', 'StopEpisode'].includes(name)) continue;
        const scope = name === 'DriverTrip' ? { loadingId: { $in: (rows.get('LoadingPanel') || []).map(doc => doc._id) } } : op.code === 'JGL' ? { $or: [{ subCompanyId: op._id }, { subCompanyId: null }] } : { subCompanyId: op._id };
        const projection = Object.fromEntries(['_id', ...(spec.number ? [spec.number] : []), ...spec.select.split(' ')].map(field => [field, 1]));
        const docs = await db.collection(pluralize(name)).find({ companyId: tenantId, isDeleted: { $ne: true }, ...scope }, { projection }).toArray();
        rows.set(name, docs);
        const index = new Map();
        for (const doc of docs) { index.set(key(doc._id), doc); if (doc[spec.number]) index.set(key(doc[spec.number]), doc); }
        indices.set(name, index);
      }
      const resolve = makeOwnershipResolver({ branches, lookup: (name, id) => indices.get(name)?.get(key(id)) });
      const panels = [];
      for (const [name, docs] of rows) {
        const unresolved = docs.filter(doc => !resolve(name, doc)?.length);
        const mixed = docs.filter(doc => resolve(name, doc)?.length > 1);
        panels.push({ panel: name, total: docs.length, unresolved: unresolved.length, mixed: mixed.length,
          unresolvedSamples: unresolved.slice(0, 5).map(doc => doc[branchModels[name].number] || key(doc._id)) });
      }
      report.push({ companyId: key(tenantId), operatingCompany: op.code, panels });
    }
  }
  console.log(JSON.stringify({ mode: 'READ ONLY', companies: report }, null, 2));
} finally { await client.close(); }
