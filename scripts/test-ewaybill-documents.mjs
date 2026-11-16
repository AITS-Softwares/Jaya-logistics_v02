import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync('src/app/api/loading-panel/[id]/ewaybill/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
let panel = { loadingWorkflow: { version: 2, part2Status: 'Draft' } }, complete = false, approved = false, reads = 0;
const note = { _id: 'lr1', lrNo: 'LR1', ewaybill: { ewaybillNo: '123456789012', file: { storageName: 'test.pdf' } } };
class Response { constructor(body, options) { this.body = body; this.status = options?.status || 200; } static json(body, options) { return new Response(body, options); } }
const GET = new Function('NextResponse', 'mongoose', 'withAuth', 'withBranchAccess', 'connectDb', 'companyScopeFilter', 'LoadingPanel', 'getLRCompletion', 'getLoadingGate', 'readEwaybillPdf', source + '\nreturn GET;')(
 Response, { isValidObjectId: () => true }, fn => fn, fn => fn, async()=>{}, (u,q)=>q,
 { findOne: () => ({ lean: async()=>panel }) },
 async()=>({ complete, message: 'LR incomplete', rows: [{ lr: { _id: 'lr1', lrNo: 'LR1' } }], notes: [note] }),
 async()=>({ allApproved: approved, message: 'Approvals pending' }),
 async()=>{ reads++; return 'pdf'; }
);
const get = query => GET({ url: 'https://local/ewaybill'+query }, { params: Promise.resolve({ id: 'loading1' }) }, {});
assert.equal((await get('?lrId=lr1')).status,403); assert.equal(reads,0);
complete=true; assert.equal((await get('?lrId=lr1')).status,403);
approved=true; assert.equal((await get('?lrId=lr1&print=1')).status,403);
assert.equal((await get('?lrId=foreign')).status,403);
assert.equal((await get('?lrId=lr1')).status,200);
panel.loadingWorkflow.part2Status='Approved'; assert.equal((await get('?lrId=lr1&print=1')).status,200);
panel.upstreamPending=['review']; assert.equal((await get('?lrId=lr1')).status,403);
panel.upstreamPending=[]; note.upstreamPending=['review']; assert.equal((await get('?lrId=lr1')).status,403);
console.log('PASS e-way bill server gates: LR completion, pricing/loading approvals, Part 2 print approval, linked LR ownership, upstream review.');

const postSource = fs.readFileSync('src/app/api/consignment-note/[id]/ewaybill/route.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
let calls = [], updates = [], configInput;
const saved = { _id: 'lr1', companyId: 'tenant1', subCompanyId: 'operating1', header: { status: 'Pending' }, lrNo: 'LR1', ewaybill: { status: 'To Be Generated' }, invoice: { file: { filePath: 'invoice.pdf' }, toObject: () => ({ boeInvoiceNo: 'INV1' }) } };
const company = { _id: 'operating1', companyId: 'tenant1' };
const POST = new Function('NextResponse','mongoose','withAuth','withBranchAccess','connectDb','companyScopeFilter','ConsignmentNote','SubCompany','getOperatingCompanyFrappeConfig','createFrappeClient','storeEwaybillPdf','readEwaybillPdf', postSource+'\nreturn POST;')(
 Response, { isValidObjectId:()=>true }, fn=>fn, fn=>fn, async()=>{}, (u,q)=>q,
 { findOne:async()=>saved, updateOne:async(q,u)=>{ updates.push([q,u]);return {modifiedCount:1}; }, findById:()=>({ select:()=>({ lean:async()=>({ewaybill:{ewaybillNo:'123456789012'}}) }) }) },
 { findOne:q=>{ assert.equal(q._id,'operating1'); assert.equal(q.companyId,'tenant1'); return {lean:async()=>company}; } },
 (input,options)=>{configInput=input; assert.equal(options.purpose,'statutory');return {erpnextCompany:'Mapped Company',localGstin:'MATCHED-GSTIN'};},
 ()=>({call:async(method,args)=>{calls.push([method,args]);return {ewaybillNo:'123456789012',expiryDate:'2026-11-20T23:59:00+05:30'};}}),
 async()=>{}, async()=>{}
);
const oldMethod=process.env.FRAPPE_EWAYBILL_GENERATE_METHOD;
try {
 delete process.env.FRAPPE_EWAYBILL_GENERATE_METHOD;
 const req={headers:{get:()=> 'application/json'},json:async()=>({action:'generate',company:'Untrusted Company'})};
 const context={params:Promise.resolve({id:'lr1'})};
 assert.equal((await POST(req,context,{})).status,503); assert.equal(calls.length,0);
 process.env.FRAPPE_EWAYBILL_GENERATE_METHOD='custom.generate';
 assert.equal((await POST(req,context,{})).status,200);
 assert.equal(configInput,company); assert.equal(calls[0][1].company,'Mapped Company'); assert.equal(calls[0][1].gstin,'MATCHED-GSTIN'); assert.equal(calls[0][1].external_id,'lr-ewaybill-lr1');
 assert(updates.some(([,u])=>u.$set['ewaybill.ewaybillNo']==='123456789012'));
 saved.header.status='Approved'; assert.equal((await POST(req,context,{})).status,409); assert.equal(calls.length,1);
} finally { if(oldMethod===undefined)delete process.env.FRAPPE_EWAYBILL_GENERATE_METHOD;else process.env.FRAPPE_EWAYBILL_GENERATE_METHOD=oldMethod; }
console.log('PASS saved LR operating-company selection, statutory mapping, unconfigured integration, API result persistence without PDF, and approved LR mutation lock. No live calls.');
