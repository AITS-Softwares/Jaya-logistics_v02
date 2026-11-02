import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let record, saved=0, synced=0;
const context=vm.createContext({console,Date,Number,String,Promise});
const user={id:'user',type:'company',companyId:'tenant'};
const workflowSource=fs.readFileSync('src/lib/vehicleNegotiationWorkflow.js','utf8');
const helpers=new vm.SourceTextModule(workflowSource,{context});await helpers.link(()=>{});await helpers.evaluate();
const deps={
 '@/lib/branchAccess':{withBranchAccess:h=>h},
 'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status||200})}},
 'mongoose':{default:{Types:{ObjectId:{isValid:()=>true}}}},
 '@/lib/db':{default:async()=>{}},
 '@/app/api/vehicle-negotiation/VehicleNegotiation':{default:{findOne:async()=>record}},
 '@/lib/auth':{getTokenFromHeader:()=> 'token',verifyJWT:()=>user},
 '@/lib/companyScope':{activeOperatingCompanyId:()=> 'operating',companyScopeFilter:(_u,f)=>f},
 '@/lib/vehicleNegotiationWorkflow':{isVnnReadyForDownstream:helpers.namespace.isVnnReadyForDownstream},
 '@/lib/workflowNotifications':{notifyModuleCreateUsers:async()=>{},notifyModuleApprovers:async()=>{}},
 '@/lib/reapprovalService':{recordApprovedRevision:async()=>{synced++;}},
 '@/lib/driverOperationalSync':{syncOperationalDriverProfile:async()=>{}},
 '@/lib/replaceCancelledVnnOrders':{replaceCancelledVnnOrders:async()=>{}}
};
async function load(path){const m=new vm.SourceTextModule(fs.readFileSync(path,'utf8'),{context});await m.link(name=>{assert(deps[name],name);const vals=deps[name];return new vm.SyntheticModule(Object.keys(vals),function(){for(const [key,val] of Object.entries(vals))this.setExport(key,val);},{context});});await m.evaluate();return m.namespace.PATCH;}
const placement=await load('src/app/api/vehicle-negotiation/[id]/placement/route.js');
const workflow=await load('src/app/api/vehicle-negotiation/[id]/workflow/route.js');
const params={params:Promise.resolve({id:'id'})};const req=body=>({json:async()=>body});
const fresh=()=>({approval:{part3Status:'Approved',purchaseType:'Approved type',paymentTerms:'Approved terms',driverName:'Existing driver',drivingLicense:'EXISTING'},workflow:{part1Locked:true,audit:[]},async save(){saved++;}});
record=fresh();let res=await placement(req({approval:{vehicleNo:'MH01AB1234',mobile:'9876543210',purchaseType:'Forged',paymentTerms:'Forged'}}),params);
assert.equal(res.status,200);assert.equal(saved,1);assert.equal(synced,1);assert.equal(record.approval.paymentTerms,'Approved terms');assert.equal(record.approval.purchaseType,'Approved type');assert.equal(record.approval.driverName,'Existing driver');assert.equal(record.approval.drivingLicense,'EXISTING');
record=fresh();record.approval.paymentTerms='';record.approval.purchaseType='';res=await placement(req({approval:{vehicleNo:'MH01AB1234',mobile:'9876543210'}}),params);assert.equal(res.status,200);
for(const approval of [{mobile:'9876543210'},{vehicleNo:'MH01AB1234'},{vehicleNo:'MH01AB1234',mobile:'123'}]){record=fresh();res=await placement(req({approval}),params);assert.equal(res.status,422);}
record=fresh();record.approval.part3Status='Pending';res=await placement(req({approval:{vehicleNo:'MH01AB1234',mobile:'9876543210'}}),params);assert.equal(res.status,409);
record=fresh();record.workflow.placementCompletedAt=new Date();res=await placement(req({approval:{vehicleNo:'MH01AB1234',mobile:'9876543210'}}),params);assert.equal(res.status,409);
record=fresh();res=await workflow(req({action:'amend-part1',reason:'Correction'}),params);assert.equal(res.status,409);assert.equal(record.workflow.part1Locked,true);
record=fresh();record.reapprovalState='unlocked';res=await workflow(req({action:'amend-part1',reason:'Correction'}),params);assert.equal(res.status,200);assert.equal(record.workflow.part1Locked,false);assert.equal(record.approval.part3Status,'Pending');
console.log('PASS: vehicle/mobile-only placement, optional driver preservation, commercial tampering ignored, missing/invalid inputs, preapproval and placed-record locks, approved amendment unlock requirement and resubmission state (offline).');
