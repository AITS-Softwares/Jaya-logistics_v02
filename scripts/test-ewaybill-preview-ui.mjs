import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const parser = createRequire(import.meta.url)('@babel/parser');
const source = fs.readFileSync('src/components/EwaybillDocuments.jsx', 'utf8');
const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
let run;
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && node.id?.name === 'run') run = node;
  for (const v of Object.values(node)) Array.isArray(v) ? v.forEach(walk) : v && typeof v === 'object' && walk(v);
}
walk(ast);
let preview, saved = 0, updates = 0, bodies = [], message;
function makeRun(snapshot, noteId = 'lr1') {
  const scope = { preview: snapshot, noteId, ensureSaved: async () => { saved++; return 'lr1'; },
    setBusy() {}, setMessage(value) { message = value; }, setPreview(value) { preview = value; },
    setData() { updates++; }, onUpdated() {}, request: async (url, options) => {
      assert.equal(url, '/api/consignment-note/lr1/ewaybill');
      const body = JSON.parse(options.body); bodies.push(body);
      return { json: async () => ({ data: body.action === 'preview' ? { payload: { lr: {} }, previewToken: 'digest', canGenerate: true } : { ewaybillNo: '123456789012' } }) };
    } };
  return new Function(...Object.keys(scope), `return (${source.slice(run.start, run.end)})`)(...Object.values(scope));
}
await makeRun(null)('generate');
assert.deepEqual(bodies, [{ action: 'preview' }]);
assert.equal(updates, 0); assert.equal(saved, 0); assert.equal(preview.noteId, 'lr1');
await makeRun(preview)('generate', true);
assert.deepEqual(bodies[1], { action: 'generate', previewToken: 'digest' });
assert.equal(saved, 0); assert.equal(updates, 1); assert.equal(preview, null);
console.log('PASS Generate opens preview only; confirmation sends the reviewed token without re-saving the LR.');

const requestCount=bodies.length;
await makeRun(null,null)('generate');
assert.equal(bodies.length,requestCount);assert.match(message,/Open a saved LR/);
