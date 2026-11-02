import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const source = fs.readFileSync('src/lib/saveNumberedDocument.js', 'utf8');
let sequence = 18, records = [], ended = 0, fail = '', retry = false;
const mongoose = { startSession: async () => ({
  async withTransaction(fn) {
    const attempt = async () => { this.seq = sequence; this.rows = []; await fn(); };
    await attempt();
    if (retry) await attempt();
    if (fail === 'commit') throw Error('commit failed');
    sequence = this.seq; records.push(...this.rows);
  },
  async endSession() { ended++; }
}) };
const save = new Function('mongoose', source.replace(/import mongoose from 'mongoose';/, '').replace('export async function', 'async function') + '; return saveNumberedDocument;')(mongoose);
class Document {
  constructor(data) { Object.assign(this, structuredClone(data)); this.isNew = true; }
  toObject() { return { _id: this._id, header: this.header }; }
  set(field, value) { if (field.startsWith('header.')) this.header[field.slice(7)] = value; else this[field] = value; }
  $session(value) { assert.equal(value, null); }
  async save({ session, validateBeforeSave }) {
    assert(this.isNew, 'every retry must insert a fresh document');
    assert.equal(validateBeforeSave, true);
    if (fail === 'save') throw Error('save failed');
    this.isNew = false; session.rows.push(this); return this;
  }
}
const allocate = async session => `OP-${++session.seq}`;
const run = () => save(new Document({_id:'fixed',header:{}}), allocate, ['number','header.number'], { validateBeforeSave:true }, async () => { if (fail === 'metadata') throw Error('metadata failed'); });
for (const kind of ['save','metadata','commit']) {
  fail = kind; await assert.rejects(run()); assert.equal(sequence,18); assert.equal(records.length,0);
}
fail = ''; retry = true;
const result = await run(); assert.equal(result.number,'OP-19'); assert.equal(result.header.number,'OP-19'); assert.equal(records.length,1); assert.equal(sequence,19); assert.equal(ended,4);
const routes = ['vehicle-negotiation','purchase-panel','Advance-Payment','pricing-panel','loading-panel','consignment-note','pod-panel','saved-reports'];
for (const folder of routes) {
  const path = `src/app/api/${folder}/route.js`, code = fs.readFileSync(path,'utf8');
  execFileSync(process.execPath,['--input-type=module','--check'],{input:code,stdio:['pipe','pipe','pipe']});
  assert(code.includes('await saveNumberedDocument('),folder);
  assert(!/^\s*(?:const|let)?\s*\w+ = await getNext/m.test(code),`${folder}: allocation outside save transaction`);
}
const changed = execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(p=>p.endsWith('.js'));
for (const path of [...changed,'src/lib/saveNumberedDocument.js']) execFileSync(process.execPath,['--input-type=module','--check'],{input:fs.readFileSync(path,'utf8'),stdio:['pipe','pipe','pipe']});
console.log('PASS: save, metadata and commit failures preserve counter; transaction retry inserts once; nested numbers match; sessions close; all new callers wired; changed JS parses. Simulated transactions, no live database.');
// ERP payments allocate in a pre-save hook; verify it uses the insert session.
const paymentSource = fs.readFileSync('src/models/Payment.js','utf8');
const hookSource = paymentSource.slice(paymentSource.indexOf('PaymentSchema.pre("save"'));
let hookSession;
const hook = new Function('PaymentSchema','Counter',hookSource
  .split('export default')[0]
  .replace('const Counter = await import("./Counter.js");',''));
let preSave;
hook({pre: (_event, fn) => {preSave = fn;}}, {default:{findOneAndUpdate:async (_f,_u,options)=>{assert.equal(options.session,hookSession);return {seq:19};}}});
let hookError;
await preSave.call({$session:()=>null}, error=>{hookError=error;});
assert.match(hookError.message,/requires a transaction/);
hookSession={inTransaction:()=>true};
const payment={$session:()=>hookSession};
await preSave.call(payment,error=>{assert.equal(error,undefined);});
assert.equal(payment.paymentNumber,'PAY-019');
console.log('PASS: ERP payment hook rejects allocation outside a transaction and joins the payment insert session.');
