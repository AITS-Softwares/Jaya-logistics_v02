import assert from 'node:assert/strict';
import fs from 'node:fs';
const route = fs.readFileSync('src/app/api/order-panel/route.js', 'utf8');
const post = route.slice(route.indexOf('const branchHandlerPOST ='), route.indexOf('const branchHandlerPUT ='));
const counterSource = fs.readFileSync('src/app/api/order-panel/OrderCounter.js', 'utf8');
assert.match(counterSource, /width: 4, session/);
const counterBody = counterSource.slice(counterSource.lastIndexOf('export async function getNextOrderPanelNumber')).replace('export ', '').split('export default')[0];
let sequence = 18, records = [], failSave = false, failCommit = false, retry = false;
let notifications = 0, sessionsEnded = 0, allocations = 0, invalidPack = false;
const user = { companyId: 'tenant', id: 'user', activeOperatingCompanyId: 'op', activeOperatingCompanyCode: 'JL' };
const allocate = async ({session}) => { assert(session?.active); allocations++; return `JL-OP-NOV-26-27-${String(++session.sequence).padStart(4,'0')}`; };
const getNextOrderPanelNumber = new Function('nextPeriodDocumentNumber', `${counterBody}; return getNextOrderPanelNumber;`)(allocate);
class ObjectId { constructor(value) { this.value = value; } static isValid() { return true; } }
class OrderPanel {
  constructor(data) { Object.assign(this, data); this._id = 'order'; }
  async save({session}) {
    assert(session.active);
    if (failSave) throw Object.assign(new Error('validation failed'), {name: 'ValidationError', errors: { field: {message:'validation failed'} }});
    session.records.push(this); return this;
  }
}
const deps = {
  withAuth: handler => handler, connectDb: async()=>{},
  NextResponse: {json: (data, options={})=>({data,status:options.status||200})},
  validateOrderWeights: ()=>null, Customer: {}, missingOrderDropRows: ()=>[],
  num: value=>Number(value)||0, objectIdOrNull: value=>value||null,
  validatePackDropLocations: ()=>({ok:!invalidPack,errors:['Invalid pack drop']}),
  mongoose: {Types:{ObjectId},startSession:async()=>({
    async withTransaction(fn) {
      const run = async()=>{this.active=true;this.sequence=sequence;this.records=[];await fn();};
      try {await run();if(retry) await run();if(failCommit) throw new Error('database commit failed');sequence=this.sequence;records.push(...this.records);}finally{this.active=false;}
    },async endSession(){sessionsEnded++;}
  })},
  getNextOrderPanelNumber, OrderPanel,
  notifyModuleApprovers: async()=>{assert.equal(records.length,1);notifications++;}
};
const handler = new Function(...Object.keys(deps), `${post}; return branchHandlerPOST;`)(...Object.values(deps));
const request = mode=>({json:async()=>({saveMode:mode,plantRows:[],packData:{}})});
const originalError = console.error; console.error=()=>{};
try {
  invalidPack=true; assert.equal((await handler(request('draft'),{},user)).status,400);assert.equal(allocations,0);invalidPack=false;
  failSave=true;assert.equal((await handler(request('draft'),{},user)).status,400);assert.equal(sequence,18);assert.equal(records.length,0);failSave=false;
  failCommit=true;assert.equal((await handler(request('draft'),{},user)).status,500);assert.equal(sequence,18);assert.equal(records.length,0);assert.equal(notifications,0);failCommit=false;
  retry=true;const result=await handler(request('draft'),{},user);assert.equal(result.status,201);assert.equal(sequence,19);assert.equal(records.length,1);assert.equal(result.data.data.orderPanelNo,'JL-OP-NOV-26-27-0019');assert.equal(sessionsEnded,3);
  const put=route.slice(route.indexOf('const branchHandlerPUT ='),route.indexOf('const branchHandlerDELETE ='));assert(!put.includes('getNextOrderPanelNumber'));
} finally {console.error=originalError;}
console.log('PASS: pack validation before allocation; save/commit failures roll back; retry saves one order/number; sessions close; draft update does not allocate. Transaction behavior simulated, no live database used.');

