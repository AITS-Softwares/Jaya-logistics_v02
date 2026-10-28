import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const filename = 'src/app/(dashboard)/admin/Consignment-Note/page.jsx';
const source = fs.readFileSync(filename, 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export default function ConsignmentNoteList/m, 'function ConsignmentNoteList');
const swc = await require('next/dist/build/swc').loadBindings();
const compiled = await swc.transform(source, { filename, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
const slots = [];
let cursor = 0;
let dirty = false;
let requests = 0;
let effects = [];
const sameDeps = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const useState = (initial) => {
  const index = cursor++;
  if (!slots[index]) slots[index] = { value: initial, set: (value) => {
    const next = typeof value === 'function' ? value(slots[index].value) : value;
    if (!Object.is(next, slots[index].value)) { slots[index].value = next; dirty = true; }
  } };
  return [slots[index].value, slots[index].set];
};
const useCallback = (fn, deps) => {
  const index = cursor++;
  if (!sameDeps(slots[index]?.deps, deps)) slots[index] = { value: fn, deps };
  return slots[index].value;
};
const useEffect = (fn, deps) => {
  const index = cursor++;
  if (!sameDeps(slots[index]?.deps, deps)) {
    const cleanup = slots[index]?.cleanup;
    slots[index] = { deps };
    effects.push(() => { cleanup?.(); slots[index].cleanup = fn(); });
  }
};
const listeners = new Map();
const deps = {
  React: { createElement: () => null }, useState, useCallback, useEffect,
  usePermission: () => ({ loading: false, canView: () => true, canCreate: () => false, canEdit: () => false, canDelete: () => false, canApprove: () => false }),
  useRouter: () => ({ push() {} }), Link: () => null, PendingToCreateChip: () => null, PendingToCreateTable: () => null,
  localStorage: { getItem: () => 'token' },
  window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) },
  fetch: async () => { requests++; return { ok: true, json: async () => ({ success: true, data: [] }) }; },
};
const List = new Function(...Object.keys(deps), `${compiled.code}\nreturn ConsignmentNoteList;`)(...Object.values(deps));
const render = () => { cursor = 0; dirty = false; List(); const pending = effects; effects = []; pending.forEach((fn) => fn()); };
async function settle() {
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setImmediate(resolve));
    if (!dirty) return;
    render();
  }
  assert.fail('LR list kept rerendering and fetching');
}
render();
await settle();
assert.equal(requests, 1, 'Mount and request completion should fetch once despite new permission callbacks');
for (let index = 0; index < 5; index++) { render(); await settle(); }
assert.equal(requests, 1, 'Ordinary rerenders and equivalent permission refreshes must not refetch');
assert(!listeners.has('focus'), 'Focusing controls must not cause a fetch');
listeners.get('reapproval:refresh')();
await settle();
assert.equal(requests, 2, 'An explicit reapproval refresh should fetch once');
console.log('PASS: LR list fetches once on mount, settles after updates, ignores recreated permission callbacks, and refreshes once on reapproval events.');
