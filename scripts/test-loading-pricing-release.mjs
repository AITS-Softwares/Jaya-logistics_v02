import assert from 'node:assert/strict';
import path from 'node:path';
import {makeHarness} from './workflow-role-harness.mjs';
const h=makeHarness();
const eligibility=h.compile('src/lib/lrPricingEligibility.js',['loadingPricingApproval','filterLrEligibleLoading']);
const gates=h.compile('src/app/api/loading-panel/findLRs.js',['getLoadingGate'],eligibility);
const panel=h.fixtures.loading;
for(const key of ['vbp','vft','vot','vl'])panel[`${key}Uploads`].approval='Approved';
const note=h.fixtures.lr;
note.invoice={file:{filePath:'invoice.pdf'}};
const completion=async()=>({complete:true,notes:[note],rows:[{state:'ready',lr:{_id:note._id}}],counts:{expected:1},total:1,ready:1});
let prints=0,files=0;
const realUpdate=h.env.ConsignmentNote.updateOne;
const overrides={...gates,path,process,getLRCompletion:completion,recordOutAfterAllPrinted:async()=>null,readFile:async()=>{files++;return Buffer.from('invoice');},NextResponse:class {
  constructor(body,options={}){this.body=body;this.status=200;this.headers=options.headers;}
  static json(body,options={}){return {...body,status:options.status||200};}
}};
h.env.ConsignmentNote.updateOne=async(...args)=>{prints++;return realUpdate(...args);};
const view=h.compile('src/app/api/loading-panel/[id]/lr/route.js',['GET'],overrides);
const print=h.compile('src/app/api/loading-panel/[id]/lr-print/route.js',['POST'],overrides);
const invoice=h.compile('src/app/api/loading-panel/[id]/lr-invoice/route.js',['GET'],overrides);
const context={params:Promise.resolve({id:panel._id})};
for(const state of ['Pending','Rejected','Approved']){
  h.fixtures.pricing.rateApproval.approvalStatus=state;
  const allowed=state==='Approved';
  const req=h.request(h.users.loading.viewer,{lrId:note._id});
  req.url=`http://offline.test/api/loading-panel/${panel._id}/lr-invoice?lrId=${note._id}`;
  const result=await view.GET(req,context);
  assert.equal(result.status,200);
  assert.equal(result.data.approvals.pricingApproved,allowed);
  assert.equal(result.data.notes.length,allowed?1:0,'Blocked view returns no LR content');
  if(!allowed)assert.match(result.data.message,/Pricing must be approved/);
  const beforePrint=prints,beforeFiles=files;
  assert.equal((await print.POST(req,context)).status,allowed?200:403);
  assert.equal((await invoice.GET(req,context)).status,allowed?200:403);
  assert.equal(prints-beforePrint,allowed?1:0,'Blocked print performs no write');
  assert.equal(files-beforeFiles,allowed?1:0,'Blocked invoice reads no file');
}
h.fixtures.pricing.reapprovalState='unlocked';
assert.equal((await gates.getLoadingGate(h.users.loading.viewer,panel)).allApproved,false);
h.fixtures.pricing.reapprovalState='none';
panel.votUploads.approval='Pending';
assert.equal((await gates.getLoadingGate(h.users.loading.viewer,panel)).allApproved,false,'Loading approvals still required');
assert.equal((await view.GET(h.request(h.users.lr.viewer),context)).status,403,'LR permissions alone do not grant Loading document access');

// Actual create/submission handlers must no longer depend on Pricing readiness.
h.reset();
h.fixtures.pricing.rateApproval.approvalStatus='Pending';
h.tables.ConsignmentNote=[];
const create=h.compile('src/app/api/consignment-note/route.js',['POST'],{getNextLRNumber:async()=> 'LR-NEW',...h.compile('src/lib/orderRowStatus.js',['validateOpenOrderRows']),...h.compile('src/lib/saveNumberedDocument.js',['saveNumberedDocument'])});
const { isVnnReadyForDownstream } = h.compile('src/lib/vehicleNegotiationWorkflow.js', ['isVnnReadyForDownstream']);
const lookup = h.compile('src/app/api/consignment-note/reference-data/route.js', ['GET'], { isVnnReadyForDownstream });
const queue = h.compile('src/app/api/consignment-note/route.js', ['GET'], { isVnnReadyForDownstream });
h.fixtures.vnn.workflow.placementCompletedAt = new Date();
const loadingRecords = h.tables.LoadingPanel;
h.tables.LoadingPanel = [];
const requestFor = (url, actor = h.users.lr.creator) => ({ ...h.request(actor), url: `http://offline.test${url}` });
assert.equal((await lookup.GET(requestFor('/api/consignment-note/reference-data?lookup=vnnOrders'))).data.eligibleRows.length, 1);
assert.equal((await queue.GET(requestFor('/api/consignment-note?lookup=pendingCount'))).data.count, 1);
const withoutLoading = await create.POST(h.request(h.users.lr.creator, { header: { orderNo: h.fixtures.order.orderPanelNo } }));
assert.equal(withoutLoading.status, 201, JSON.stringify(withoutLoading));
assert.equal(withoutLoading.data.loadingInfoNo, '');
h.tables.ConsignmentNote = [];
h.tables.LoadingPanel = loadingRecords;
h.fixtures.loading.loadingWorkflow.part2Status = 'Submitted';
const created=await create.POST(h.request(h.users.lr.creator,{loadingInfoNo:h.fixtures.loading.vehicleArrivalNo,header:{orderNo:h.fixtures.order.orderPanelNo}}));
assert.equal(created.status,201,JSON.stringify(created));
h.reset();
h.fixtures.pricing.rateApproval.approvalStatus='Pending';
h.fixtures.lr.isDraft=true;h.fixtures.lr.header.status='Draft';
const submit=h.compile('src/app/api/consignment-note/route.js',['PUT']);
const submitted=await submit.PUT(h.request(h.users.lr.editor,{id:h.fixtures.lr._id,saveMode:'submit'}));
assert.equal(submitted.status,200,JSON.stringify(submitted));
console.log('PASS: actual LR creation/submission work with Pending Pricing; Loading LR content, invoice file and print routes block Pending/Rejected Pricing and corrections, allow approved Pricing, retain Loading approvals and module separation. Offline, no database changes.');
