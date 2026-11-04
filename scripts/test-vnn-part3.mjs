import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {INVALID_VNN_FIXED_RATE, parseVnnFixedRate, vnnPurchaseType} from '../src/lib/vnnPart3.mjs';
assert.equal(parseVnnFixedRate('₹1,25,000.50'),125000.50);
assert.equal(parseVnnFixedRate('25,000'),25000);
assert.equal(parseVnnFixedRate(''),0);
assert.equal(parseVnnFixedRate('2,5,000'),null);
const vendors=[{vendorName:'Supplier A',vendorCode:'A1',purchaseType:'Loading'},{vendorName:'Supplier B',vendorCode:'B1',purchaseType:'Unloading'}];
assert.equal(vnnPurchaseType(vendors,{vendorCode:' b1 '}),'Unloading');
assert.equal(vnnPurchaseType(vendors,{vendorCode:'A1',purchaseType:'Forged'}),'Loading');
assert.equal(vnnPurchaseType(vendors,{vendorCode:'C1'}),'');
assert.equal(vnnPurchaseType(vendors,{}),'');
assert.equal(vnnPurchaseType(vendors,{vendorName:'supplier a'}),'Loading');
assert.equal(vnnPurchaseType([{vendorName:'Supplier A',purchaseType:'Loading'}],{vendorCode:'A1',vendorName:'Supplier A'}),'Loading');
assert.equal(vnnPurchaseType(vendors,{vendorCode:'C1',vendorName:'Supplier A'}),'');
assert.equal(vnnPurchaseType([...vendors,{vendorCode:'A1',purchaseType:'Different'}],{vendorCode:'A1'}),'');
assert.equal(vnnPurchaseType(vendors.filter(row=>row.vendorCode!=='A1'),{vendorCode:'A1'}),'');
assert.equal(vnnPurchaseType([{...vendors[0],purchaseType:'Updated'}],{vendorCode:'A1'}),'Updated');
let record,saved=0;
const context=vm.createContext({console,Date,Number,String});
const user={id:'user',type:'company',companyId:'tenant'};
const deps={
 '@/lib/branchAccess':{withBranchAccess:handler=>handler},
 'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status || 200})}},
 'mongoose':{default:{Types:{ObjectId:{isValid:()=>true}}}},
 '@/lib/db':{default:async()=>{}},
 '@/app/api/vehicle-negotiation/VehicleNegotiation':{default:{findOne:async()=>record}},
 '@/lib/auth':{getTokenFromHeader:()=> 'token',verifyJWT:()=>user},
 '@/lib/companyScope':{activeOperatingCompanyId:()=> 'operating',companyScopeFilter:(user,filter)=>filter},
 '@/lib/vnnPart3.mjs':{INVALID_VNN_FIXED_RATE,parseVnnFixedRate,vnnPurchaseType}
};
const route=new vm.SourceTextModule(fs.readFileSync('src/app/api/vehicle-negotiation/[id]/part3/route.js','utf8'),{context});
await route.link(name=>{assert(deps[name],`Unexpected import ${name}`);const values=deps[name];return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value] of Object.entries(values))this.setExport(key,value);},{context});});await route.evaluate();
record={vendors,approval:{vendorCode:'A1',part3Status:'Pending'},workflow:{audit:[]},async save(){saved++;}};
let result=await route.namespace.PATCH({json:async()=>({approval:{commercialRemarks:'Call before arrival',purchaseType:'Forged'}})},{params:Promise.resolve({id:'id'})});
assert.equal(result.status,200);assert.equal(record.approval.commercialRemarks,'Call before arrival');assert.equal(record.approval.purchaseType,'Loading');assert.equal(saved,1);
result=await route.namespace.PATCH({json:async()=>({approval:{rateType:'Fixed',finalFix:'25,000'}})},{params:Promise.resolve({id:'id'})});
assert.equal(result.status,200);assert.equal(record.approval.finalFix,25000);assert.equal(saved,2);
result=await route.namespace.PATCH({json:async()=>({approval:{finalFix:'2,5,000'}})},{params:Promise.resolve({id:'id'})});
assert.equal(result.status,422);assert.equal(record.approval.finalFix,25000);assert.equal(saved,2);
record.workflow.part1Locked=true;
result=await route.namespace.PATCH({json:async()=>({approval:{commercialRemarks:'Must not save'}})},{params:Promise.resolve({id:'id'})});
assert.equal(result.status,409);assert.equal(record.approval.commercialRemarks,'Call before arrival');assert.equal(saved,2);
console.log('PASS: selected supplier matching, updates/removal, conflicting types, server-derived purchase type, saved creator remarks and locked Part 3 protection (offline).');
