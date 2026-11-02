import assert from 'node:assert/strict';
import fs from 'node:fs';
const hooks = new Map();
const schema = { add() {}, path() { return null; }, base: { Schema: { Types: { Mixed: Object, ObjectId: String } } }, pre(name, handler) { if (!hooks.has(name)) hooks.set(name, []); hooks.get(name).push(handler); } };
const source = fs.readFileSync('src/lib/softDelete.js', 'utf8').replace('export default function', 'function');
new Function(`${source}\nreturn softDeletePlugin;`)()(schema);
function save(state, allowed = false) {
  const record = { cancellation: { state }, $locals: { allowCancellationWrite: allowed } };
  let error;
  for (const hook of hooks.get('save')) hook.call(record, value => { error = value; });
  return error;
}
assert.match(save('cancelled').message, /cancelled orders/);
assert.match(save('review').message, /cancelled orders/);
assert.equal(save('resolved'), undefined);
assert.equal(save('cancelled', true), undefined, 'Narrow charge/cancellation handler may persist');
for (const method of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne']) {
  const guard = hooks.get(method).find(hook => hook.name === 'preventCancelledProgression');
  const query = { getOptions: () => ({}), getQuery: () => ({ companyId: 'tenant', _id: 'row' }), model: { findOne: filter => { assert.deepEqual(filter.$and[0], { companyId: 'tenant', _id: 'row' }); assert.deepEqual(filter.$and[1]['cancellation.state'].$in, ['cancelled', 'review']); return { session() { return this; }, select() { return this; }, lean: async () => ({ _id: 'row' }) }; } } };
  await assert.rejects(guard.call(query), /cancelled/);
  query.getOptions = () => ({ allowCancellationWrite: true });
  await guard.call(query);
}
console.log('PASS: save and query-update guards block cancelled/shared records; authorized charge writes and reviewed correction states remain supported.');
