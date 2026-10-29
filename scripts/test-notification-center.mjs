import assert from 'node:assert/strict';
import { describeActivity, describeWork, groupActivity, splitWork } from '../src/lib/notificationCenter.mjs';

const messages = [
  { _id: 'old', type: 'vnn-replacement-needed', message: 'Order JGL-OP-DEMO-00496 was held in VNN JGL-VNN-DEMO-00002.', createdAt: '2026-10-29T09:00:00Z', read: false },
  { _id: 'new', type: 'vnn-replacement-needed', message: 'Order JGL-OP-DEMO-00496 was cancelled in VNN JGL-VNN-DEMO-00002.', createdAt: '2026-10-29T10:00:00Z', read: false },
  { _id: 'other', type: 'vnn-replacement-needed', message: 'VNN JGL-VNN-DEMO-00003 needs replacement orders.', createdAt: '2026-10-29T08:00:00Z', read: true },
];
const grouped = groupActivity(messages);
assert.equal(grouped.length, 2);
assert.equal(grouped[0].latest._id, 'new');
assert.equal(grouped[0].display.reference, 'JGL-VNN-DEMO-00002');
assert.equal(grouped[0].items.length, 2);
assert.equal(grouped[0].unread, 2);
assert.equal(grouped[0].display.url, '/admin/vehicle-negotiation');
assert.equal(messages[0]._id, 'old', 'Grouping does not reorder the source inbox');
assert.equal(groupActivity(messages.map(item => ({ ...item, read: true })))[0].unread, 0);
assert.equal(groupActivity([{ _id: 'a' }, { _id: 'b' }]).length, 2, 'Unrelated generic updates stay separate');
assert.equal(groupActivity([{ ...messages[0], sourceModel: 'VehicleNegotiation', sourceRecordId: 'same' }, { ...messages[1], sourceModel: 'VehicleNegotiation', sourceRecordId: 'same', reference: 'renamed' }]).length, 1);

const work = [
  { id: 'approval', actionable: true, reapprovalState: 'pendingReapproval', path: '/admin/vehicle-negotiation/approve/one' },
  { id: 'waiting', actionable: false, reapprovalState: 'blockedByUpstream', path: '/admin/Consignment-Note' },
  { id: 'sync-observer', actionable: false, reapprovalState: 'syncFailed', path: '/admin/Loading-Info/one/view' },
  { id: 'sync-admin', actionable: true, reapprovalState: 'syncFailed', path: '/admin/Loading-Info/one' },
  { id: 'complete', actionable: true, reapprovalState: 'none' },
];
assert.deepEqual(splitWork(work).actions.map(row => row.id), ['approval', 'sync-admin']);
assert.deepEqual(splitWork(work).waiting.map(row => row.id), ['waiting', 'sync-observer']);
const beforeRead = splitWork(work);
groupActivity(messages.map(item => ({ ...item, read: true })));
assert.deepEqual(splitWork(work), beforeRead, 'Reading activity cannot complete or remove a pending task');
assert.equal(describeWork(work[0]).action, 'Review reapproval');
assert.equal(describeWork({ latestVnnSyncRequired: true, latestVnnNo: 'VNN-1' }).title, 'Sync before reapproval');
assert.equal(describeWork({ reapprovalState: 'unlocked' }).action, 'Continue editing');
assert.equal(describeWork({ latestVnnSyncAmbiguous: true }).action, 'Review links');
assert.equal(describeActivity({ type: 'push-test' }).title, 'Notification test');
console.log('PASS: grouped activity, newest update ordering, live action counts, waiting stages, sync tasks, and read/work independence.');
