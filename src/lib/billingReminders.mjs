import { ObjectId } from 'mongodb';
import { branchModels, makeOwnershipResolver } from './branchOwnership.mjs';
import { billingKey as key, billingGroupsForUser, billingReminderDueAt, indiaDateKey, isReminderLr, isYaraClient, remainingBillingQuantity } from './billingReminderPolicy.mjs';

const collections = { OrderPanel: 'orderpanels', VehicleNegotiation: 'vehiclenegotiations', LoadingPanel: 'loadingpanels', ConsignmentNote: 'consignmentnotes' };
const oid = value => value instanceof ObjectId ? value : new ObjectId(key(value));
const norm = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function loadBillingReminderGroups(db, companyId, now = new Date()) {
  const filter = { companyId: oid(companyId), isDeleted: { $ne: true } };
  const [notes, reports, customers, operating, branches] = await Promise.all([
    db.collection('consignmentnotes').find(filter).project({ lrNo: 1, customerId: 1, consignor: 1, header: 1, totalWeight: 1, createdAt: 1, isDraft: 1, subCompanyId: 1, vehicleNegotiationRef: 1, vnnNo: 1, loadingInfoNo: 1, consignmentBreakdown: 1 }).toArray(),
    db.collection('savedreports').find({ ...filter, type: { $in: ['general', 'product-wise', 'mosaic'] } }).project({ type: 1, data: 1, subCompanyId: 1 }).toArray(),
    db.collection('customers').find({ companyId: oid(companyId) }).project({ customerName: 1 }).toArray(),
    db.collection('subcompanies').find({ companyId: oid(companyId), isActive: { $ne: false } }).project({ name: 1, code: 1 }).toArray(),
    db.collection('branches').find({ companyId: oid(companyId) }).project({ name: 1, code: 1 }).toArray(),
  ]);
  const legacyId = key(operating.find(item => item.code === 'JGL')?._id);
  const effectiveCompany = doc => key(doc.subCompanyId) || legacyId;
  const customerById = new Map(customers.map(customer => [key(customer), customer]));
  const customerByName = new Map(customers.map(customer => [norm(customer.customerName), customer]));
  const due = notes.filter(isReminderLr).map(note => {
    const customer = customerById.get(key(note.customerId || note.consignor?.customerId)) || customerByName.get(norm(note.header?.partyName || note.consignor?.name));
    const name = customer?.customerName || note.header?.partyName || note.consignor?.name || '';
    const dueAt = billingReminderDueAt(note.createdAt, name);
    return { note, customer, name, dueAt, op: effectiveCompany(note) };
  }).filter(row => row.name && row.op && row.dueAt && row.dueAt <= now);
  if (!due.length) return [];

  // Resolve current ownership through the same source links as transaction APIs.
  const sourceRows = new Map([['ConsignmentNote', notes]]);
  await Promise.all(Object.entries(collections).filter(([model]) => model !== 'ConsignmentNote').map(async ([model, collection]) => {
    const projection = Object.fromEntries(`_id subCompanyId ${branchModels[model].number || ''} ${branchModels[model].select}`.split(/\s+/).filter(Boolean).map(field => [field, 1]));
    sourceRows.set(model, await db.collection(collection).find(filter).project(projection).toArray());
  }));
  const groups = new Map();
  for (const operatingCompany of operating) {
    const opId = key(operatingCompany);
    const scopedReports = reports.filter(report => effectiveCompany(report) === opId);
    const indices = new Map();
    for (const [model, rows] of sourceRows) {
      const index = new Map();
      for (const row of rows.filter(row => effectiveCompany(row) === opId)) {
        index.set(key(row), row);
        const number = branchModels[model].number;
        if (row[number]) index.set(key(row[number]), row);
      }
      indices.set(model, index);
    }
    const resolve = makeOwnershipResolver({ lookup: (model, id) => indices.get(model)?.get(key(id)), branches });
    for (const entry of due.filter(row => row.op === opId)) {
      const billing = remainingBillingQuantity(entry.note, scopedReports);
      if (billing.fullyBilled) continue;
      const clientKey = key(entry.customer) || norm(entry.name);
      const groupKey = `${key(companyId)}:${opId}:${clientKey}`;
      if (!groups.has(groupKey)) groups.set(groupKey, { groupKey, companyId: key(companyId), subCompanyId: opId,
        clientId: key(entry.customer), clientName: entry.name, billingType: isYaraClient(entry.name) ? 'product-wise' : 'general', rows: [] });
      groups.get(groupKey).rows.push({ id: key(entry.note), lrNo: entry.note.lrNo, dueAt: entry.dueAt,
        remainingQty: billing.remaining, branchIds: resolve('ConsignmentNote', entry.note) || [] });
    }
  }
  return [...groups.values()];
}

export function billingGroupUrl(group) {
  const params = new URLSearchParams({ billingType: group.billingType, search: group.clientName, status: 'outstanding' });
  if (group.clientId) params.set('clientId', group.clientId);
  return `/admin/Billing/reports?${params}`;
}

export async function queueBillingReminders(db, now = new Date()) {
  const notifications = db.collection('notifications');
  const localHour = (now.getUTCHours() + 5 + (now.getUTCMinutes() >= 30 ? 1 : 0)) % 24;
  // Default to 09:00 India time; once past that time, late worker starts catch up.
  const requestedHour = Number(process.env.BILLING_REMINDER_HOUR_IST ?? 9);
  const hour = Number.isInteger(requestedHour) && requestedHour >= 0 && requestedHour <= 23 ? requestedHour : 9;
  if (localHour < hour) return { queued: 0 };
  const companyIds = await db.collection('consignmentnotes').distinct('companyId', { isDeleted: { $ne: true } });
  let queued = 0;
  for (const companyId of companyIds.filter(value => value && ObjectId.isValid(key(value)))) {
    const groups = await loadBillingReminderGroups(db, companyId, now);
    const recipients = await db.collection('companyusers').find({ companyId: oid(companyId), isActive: { $ne: false } }).toArray();
    for (const recipient of recipients) for (const group of billingGroupsForUser(recipient, groups)) {
      const reminderKey = `billing:${key(recipient)}:${group.groupKey}:${indiaDateKey(now)}`;
      const result = await notifications.updateOne({ reminderKey }, { $setOnInsert: {
        reminderKey, billingGroupKey: group.groupKey, billingLrIds: group.rows.map(row => oid(row.id)),
        user: recipient._id, assignedTo: recipient._id, company: oid(companyId), subCompanyId: oid(group.subCompanyId),
        type: 'billing-reminder', moduleName: 'Billing', requiredAction: 'create', branchIds: group.branchIds.map(oid),
        reference: group.clientName, message: `${group.clientName}: ${group.rows.length} LR${group.rows.length === 1 ? '' : 's'} awaiting full billing.`,
        url: billingGroupUrl(group), read: false, role: 'user', pushState: 'pending', pushAttempts: 0,
        pushNextAttemptAt: now, createdAt: now, updatedAt: now,
      } }, { upsert: true });
      if (result.upsertedCount) queued++;
    }
    // Resolve reminders after billing or removal of the recipient's access.
    const current = await notifications.find({ company: oid(companyId), type: 'billing-reminder', read: false }).project({ assignedTo: 1, billingGroupKey: 1 }).toArray();
    const available = new Map(recipients.map(user => [key(user), new Set(billingGroupsForUser(user, groups).map(group => group.groupKey))]));
    const resolvedIds = current.filter(item => !available.get(key(item.assignedTo))?.has(item.billingGroupKey)).map(item => item._id);
    if (resolvedIds.length) await notifications.updateMany({ _id: { $in: resolvedIds } }, { $set: { read: true, resolvedAt: now, pushState: 'skipped' } });
  }
  return { queued };
}
