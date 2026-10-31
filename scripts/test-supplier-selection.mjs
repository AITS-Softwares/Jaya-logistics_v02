import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {supplierSelectionFilter} from '../src/lib/supplierSelection.mjs';
const samples=[{_id:'active',companyId:'A',approvalStatus:'Approved',status:'Active',supplierCode:'A1',supplierName:'Active supplier'}, {_id:'inactive',companyId:'A',approvalStatus:'Approved',status:'Inactive',supplierCode:'I1',supplierName:'Inactive supplier'}, {_id:'pending',companyId:'A',approvalStatus:'Pending',status:'Active',supplierCode:'P1',supplierName:'Pending supplier'}, {_id:'legacy',companyId:'A',approvalStatus:'Approved',supplierCode:'L1',supplierName:'Older active supplier'}, {_id:'foreign',companyId:'B',approvalStatus:'Approved',status:'Active',supplierCode:'B1',supplierName:'Other company'}, {_id:'invalid',companyId:'A',approvalStatus:'Approved',status:null,supplierCode:'X1',supplierName:'Invalid status'}].map(row=>({...row,toObject(){const {toObject,...data}=this;return data;}}));
function matches(row,filter){return Object.entries(filter).every(([key,value])=>{if(key==='$and')return value.every(part=>matches(row,part));if(key==='$or')return value.some(part=>matches(row,part));if(value && '$exists' in Object(value))return value.$exists?(key in row):!(key in row);if(value?.test)return value.test(row[key] || '');return row[key]===value;});}
function query(value){return {select(){return this;},setOptions(){return this;},populate(){return this;},sort(){return this;},limit(){return this;},lean(){return Promise.resolve(value);},then(resolve,reject){return Promise.resolve(value).then(resolve,reject);}};}
const supplier={find:filter=>query(samples.filter(row=>matches(row,filter))),findOne:filter=>query(samples.find(row=>matches(row,filter)) || null)};
async function load(file){const context=vm.createContext({URL,console});const deps={
 'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status || 200})}},
 '@/lib/supplierSelection.mjs':{supplierSelectionFilter},
 '@/models/SupplierModels':{default:supplier},
 '@/models/BankHead':{default:{}},
 '@/lib/db':{default:async()=>{}},'@/lib/db.js':{default:async()=>{}},
 '@/lib/masterDataPermission':{validateMasterDataRequest:async()=>({user:{companyId:'A'}})},
 '@/lib/masterApprovalAccess':{masterApprovalAccess:async()=>({user:{companyId:'A'}}),withMasterSubmitterNames:async rows=>rows},
 '@/lib/masterApprovalService':{createPendingMaster(){},submitMasterChange(){},approvalManagementRecord:row=>row.toObject()},
 '@/lib/masterApprovalPolicy.mjs':{pickPaths(){},SUPPLIER_SENSITIVE:[],SUPPLIER_IMMEDIATE:[]},
 '@/lib/masterApprovalRoutes':{notifyMasterSubmission(){}},
 '@/lib/identifierFormats':{identifierFormatError(){}},
 '@/lib/frappe-supplier.mjs':{syncSupplier(){}}
};const route=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context});await route.link(name=>{const exports=deps[name];assert(exports,`Unexpected import ${name}`);return new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value] of Object.entries(exports))this.setExport(key,value);},{context});});await route.evaluate();return route.namespace;}
const root=await load('src/app/api/suppliers/route.js');
let result=await root.GET({url:'https://test/api/suppliers'});assert.equal(result.status,200);assert.deepEqual(result.body.data.map(row=>row._id),['active','legacy']);
result=await root.GET({url:'https://test/api/suppliers?management=true'});assert(result.body.data.some(row=>row._id==='inactive'));assert(result.body.data.some(row=>row._id==='pending'));
const search=await load('src/app/api/suppliers/search/route.js');result=await search.GET({url:'https://test/api/suppliers/search?q=supplier'});assert.deepEqual(result.body.data.map(row=>row._id),['active','legacy']);
const lookup=await load('src/app/api/suppliers/lookup/route.js');result=await lookup.GET({url:'https://test/api/suppliers/lookup?code=I1'});assert.equal(result.status,404);
result=await lookup.GET({url:'https://test/api/suppliers/lookup?code=A1'});assert.equal(result.body.data._id,'active');
const byCode=await load('src/app/api/suppliers/by-code/[code]/route.js');result=await byCode.GET({url:'https://test/api/suppliers/by-code/I1'},{params:Promise.resolve({code:'I1'})});assert.equal(result.status,404);
console.log('PASS: actual supplier list/search/lookup/by-code handlers exclude inactive, pending, invalid-status and foreign suppliers; older approved active suppliers remain selectable; management retains inactive records (offline doubles).');
