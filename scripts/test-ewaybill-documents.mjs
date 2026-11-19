import { validateEwaybillLr } from '../src/lib/ewaybill-validation.mjs';
import { recoverEwaybill, ewaybillStatusMethod } from '../src/lib/ewaybill-recovery.mjs';
import { buildEwaybillPayload, ewaybillPreviewToken } from '../src/lib/ewaybill-preview.mjs';
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
let calls = [], updates = [], configInput, configured = false, staleWrite = false, generationFailure = false, remoteState = 'Ready', statusFailure = false;
const statutory = {docType:'INV', transMode:'1', supplyType:'O', subSupplyType:'1', transactionType:'1', vehicleType:'R', transDistance:'150',
 fromAddr1:'Address A',fromPlace:'Pune',fromPincode:'411001',fromStateCode:'27',actFromStateCode:'27',toAddr1:'Address B',toPlace:'Mumbai',toPincode:'400001',toStateCode:'27',actToStateCode:'27',
 totalValue:'100',cgstValue:'9',sgstValue:'9',igstValue:'0',cessValue:'0',cessNonAdvolValue:'0',otherValue:'0',
 itemList:[{productDesc:'Goods',hsnCode:'7308',quantity:'1',qtyUnit:'NOS',taxableAmount:'100',cgstRate:'9',sgstRate:'9',igstRate:'0',cessRate:'0',cessNonAdvol:'0'}]};
const saved = {_id:'lr1',companyId:'tenant1',subCompanyId:'operating1',subCompanyCode:'NEW',updatedAt:'v1',header:{status:'Draft',vehicleNo:'MH12AB1234'},lrNo:'LR1',ewaybill:{status:'To Be Generated'},
 consignor:{name:'Supplier',address:'Billing A',gstNumber:'27AAAAA0000A1Z5'},consignee:{name:'Recipient',address:'Billing B',gstNumber:'27AAAAA0000A1Z5'},
 invoice:{boeInvoiceNo:'INV1',boeInvoiceDate:'2026-01-01',invoiceValue:'118',ewaybillData:statutory,file:{filePath:'invoice.pdf'}}};
const company={_id:'operating1',companyId:'tenant1'};
const POST=new Function('NextResponse','mongoose','withAuth','withBranchAccess','connectDb','companyScopeFilter','ConsignmentNote','SubCompany','getOperatingCompanyFrappeConfig','createFrappeClient','storeEwaybillPdf','readEwaybillPdf','isFrappeConfigured','buildEwaybillPayload','ewaybillPreviewToken','validateEwaybillLr','recoverEwaybill','ewaybillStatusMethod',postSource+'\nreturn POST;')(
 Response,{isValidObjectId:()=>true},fn=>fn,fn=>fn,async()=>{},(u,q)=>q,
 {findOne:async()=>saved, updateOne:async(q,u)=>{updates.push([q,u]);if(staleWrite)return {modifiedCount:0};for(const [key,value] of Object.entries(u.$set))saved.ewaybill[key.slice('ewaybill.'.length)]=value;return {modifiedCount:1};},findById:()=>({select:()=>({lean:async()=>saved})})},
 {findOne:q=>{assert.equal(q._id,'operating1');assert.equal(q.companyId,'tenant1');return {lean:async()=>company};}},
 (input,options)=>{configInput=input;assert.equal(options.purpose,'statutory');return {erpnextCompany:'Mapped Company',localGstin:'27AAAAA0000A1Z5',enabled:true};},
 ()=>({call:async(method,args)=>{calls.push([method,args]);if(method === 'custom.generate' && generationFailure)throw new Error('Simulated dispatch failure');if(method === 'custom.status'){if(statusFailure)throw new Error('Status unreachable');return {state:remoteState,requestName:'request1'};}return method==='custom.preview'?{requestName:'request1',preparedVersion:'version1',canGenerate:true,warnings:[],providerPayload:{docNo:'INV1'}}:{ewaybillNo:'123456789012',expiryDate:'2099-11-20T23:59:00+05:30',requestName:'request1',pdfPending:true,distance:175};}}),
 async()=>{},async()=>{},()=>configured,buildEwaybillPayload,ewaybillPreviewToken,validateEwaybillLr,recoverEwaybill,ewaybillStatusMethod);
const keys=['FRAPPE_EWAYBILL_GENERATE_METHOD','FRAPPE_EWAYBILL_PREVIEW_METHOD','FRAPPE_EWAYBILL_FETCH_METHOD','FRAPPE_EWAYBILL_ENABLED'];
const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
const context={params:Promise.resolve({id:'lr1'})};
const req=(action,token)=>({headers:{get:()=> 'application/json'},json:async()=>({action,previewToken:token,company:'Untrusted Company'})});
try {
 for(const k of keys)delete process.env[k];
 assert.equal((await POST(req('generate'),context,{})).status,503);assert.equal(calls.length,0);
 const unconfigured=await POST(req('preview'),context,{});
 assert.equal(unconfigured.status,200);assert.equal(unconfigured.body.data.canGenerate,false);assert.equal(calls.length,0);
 process.env.FRAPPE_EWAYBILL_GENERATE_METHOD='custom.generate';process.env.FRAPPE_EWAYBILL_PREVIEW_METHOD='custom.preview';process.env.FRAPPE_EWAYBILL_FETCH_METHOD='custom.fetch';process.env.FRAPPE_EWAYBILL_ENABLED='true';configured=true;
 const originalConsignee=saved.consignee;saved.consignee={};
 const missing=(await POST(req('preview'),context,{})).body.data;
 assert.equal(missing.canGenerate,false);assert(missing.warnings.some(w=>w.includes('Consignee')));assert.equal(calls.length,0);
 saved.consignee=originalConsignee;
 assert.equal((await POST(req('generate'),context,{})).status,409);assert.equal(calls.length,0);
 const preview=(await POST(req('preview'),context,{})).body.data;
 assert.equal(preview.canGenerate,true);assert.equal(calls.length,1);assert.equal(calls[0][0],'custom.preview');
 assert.equal(preview.payload.lr.invoice.file,undefined);assert.equal(preview.payload.lr.invoice.extraction,undefined);assert.equal(preview.payload.company,'Mapped Company');
 assert.equal(saved.ewaybill.preparedVersion,'version1');
 saved.header.vehicleNo='MH12AB9999';
 assert.equal((await POST(req('generate',preview.previewToken),context,{})).status,409);assert.equal(calls.length,1);
 saved.header.vehicleNo='MH12AB1234';
 process.env.FRAPPE_EWAYBILL_ENABLED='false';assert.equal((await POST(req('generate',preview.previewToken),context,{})).status,403);assert.equal(calls.length,1);process.env.FRAPPE_EWAYBILL_ENABLED='true';
 staleWrite=true;assert.equal((await POST(req('generate',preview.previewToken),context,{})).status,409);assert.equal(calls.length,1);staleWrite=false;
 assert.equal((await POST(req('generate',preview.previewToken),context,{})).status,200);assert.equal(calls.length,2);
 assert.equal(saved.ewaybill.distance,175);
 assert.equal(calls[1][1].prepared_version,'version1');assert.equal(calls[1][1].source_company_id,'operating1');assert.equal(calls[1][1].source_company_code,'NEW');assert.equal(calls[1][1].ewaybill_no,undefined);
 assert.equal(configInput,company);assert.equal(saved.ewaybill.ewaybillNo,'123456789012');assert.equal(saved.ewaybill.apiState,'complete');
 assert.equal((await POST(req('generate',preview.previewToken),context,{})).status,409);assert.equal(calls.length,2);
 assert.equal((await POST(req('fetch'),context,{})).status,200);assert.equal(calls[2][0],'custom.fetch');assert.equal(calls[2][1].ewaybill_no,'123456789012');
 saved.header.status='Approved';assert.equal((await POST(req('fetch'),context,{})).status,409);assert.equal(calls.length,3);
 saved.header.status='Draft';generationFailure=true;
 for (const [state,unreachable,expected] of [['Ready',false,'idle'],['Processing',false,'uncertain'],['Uncertain',false,'uncertain'],['Ready',true,'uncertain']]) {
   saved.ewaybill={status:'To Be Generated'};remoteState=state;statusFailure=unreachable;
   const prepared=(await POST(req('preview'),context,{})).body.data;
   assert.equal((await POST(req('generate',prepared.previewToken),context,{})).status,400);
   assert.equal(saved.ewaybill.apiState,expected);
   if(expected==='idle')assert.equal(saved.ewaybill.previewToken,'');
 }
 statusFailure=false;remoteState='Ready';
 assert.equal((await POST(req('status'),context,{})).status,200);
 assert.equal(saved.ewaybill.apiState,'idle','A previously stuck request can be checked without another generation');
} finally {for(const k of keys)if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}
console.log('PASS saved-company scope, missing-party blocking, remote prepared preview, stale confirmations/writes, generation gates, persisted results and Fetch recovery. No live calls.');
