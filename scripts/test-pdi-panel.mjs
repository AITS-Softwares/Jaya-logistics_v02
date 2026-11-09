import assert from 'node:assert/strict';
import { materials, inspectionView, mergeInspection } from '../src/lib/pdiRules.mjs';
const order = {_id:'o1',panelStatus:'Approved',plantRows:[{_id:'lane',status:'Open'}],packData:{'UNIFORM - BAGS/BOXES':[{_id:'a',plantRowId:'lane',productName:'A',totalPkgs:10},{_id:'b',plantRowId:'lane',productName:'B',totalPkgs:20}]}};
const input=(id,status,qty)=>({materialId:id,packedStatus:status,availableQty:qty});
assert.equal(inspectionView(order).status,'Pending');
let items=mergeInspection(order,null,[input('a','Not Packed',7)]);
assert.equal(inspectionView(order,{items}).status,'In Progress');
items=mergeInspection(order,{items},[input('b','Fully Packed',0)]);
assert.equal(inspectionView(order,{items}).status,'Completed');
assert.equal(items[0].availableQty,7); // Independent manual quantity preserved
for(const qty of [-1,11,NaN,Infinity,'2',null]) assert.throws(()=>mergeInspection(order,null,[input('a','Fully Packed',qty)]));
assert.throws(()=>mergeInspection(order,null,[input('foreign','Fully Packed',1)]));
assert.throws(()=>mergeInspection(order,null,[input('a','Invalid',1)]));
assert.throws(()=>mergeInspection(order,null,[input('a','Not Packed',0),input('a','Not Packed',0)]));
assert.throws(()=>mergeInspection({...order,panelStatus:'Cancelled'},null,[input('a','Not Packed',0)]));
assert.throws(()=>mergeInspection({...order,plantRows:[{_id:'lane',status:'Hold'}]},null,[input('a','Not Packed',0)]));
const changed=structuredClone(order);changed.packData['UNIFORM - BAGS/BOXES'][0].totalPkgs=11;
assert.equal(inspectionView(changed,{items}).status,'In Progress');assert.equal(inspectionView(changed,{items}).items[0].needsReview,true);
const added=structuredClone(order);added.packData['UNIFORM - BAGS/BOXES'].push({_id:'c',totalPkgs:2});
assert.equal(inspectionView(added,{items}).status,'In Progress');
assert.equal(materials({packData:{'LOOSE - CARGO':[{_id:'l',actualWt:2,uom:'MT'}]}})[0].unit,'MT');
assert.equal(inspectionView({packData:{}},{items:[]}).status,'Pending');
console.log('PDI rules: passed (partial merge, independent status/qty, completion, bounds, IDs, holds, cancellation, stale materials, loose cargo).');
import fs from 'node:fs';
const rules = await import('../src/lib/pdiRules.mjs');
const source=fs.readFileSync(new URL('../src/app/api/pdi-panel/route.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export const /g,'const ');
const factory=new Function('NextResponse','mongoose','connectDb','withAuth','hasPermission','withBranchAccess','companyScopeFilter','OrderPanel','PdiPanel','inspectionView','mergeInspection',source+';return {GET,PATCH};');
const scopedOrder={...order,_id:'a'.repeat(24)};
let docs=[],identity={id:'inspector',name:'Inspector',companyId:'tenant',activeOperatingCompanyId:'op',permissions:['view','edit']};
const query=value=>({select(){return this},sort(){return this},lean:async()=>value});
class Model {
 constructor(fields){Object.assign(this,fields);this.history=[];this.__v=0;}
 static find(){return query(docs);}
 static async findOne(){return docs[0]||null;}
 toObject(){return {...this};}
 async save(){if(!docs.includes(this))docs.push(this);else this.__v++;}
}
const auth=(fn,options)=>async req=>options&&!identity.permissions.includes(options.action)?Response.json({success:false},{status:403}):fn(req,null,identity);
const handlers=factory({json:(...args)=>Response.json(...args)},{isValidObjectId:id=>/^[a-f\d]{24}$/.test(id)},async()=>{},auth,(user,module,action)=>module==='PDI Panel'&&user.permissions.includes(action),fn=>fn,(user,filter)=>filter,{find:()=>query([scopedOrder]),findOne:()=>query(scopedOrder)},Model,rules.inspectionView,rules.mergeInspection);
const request=body=>({url:'http://local/api/pdi-panel?orderId='+scopedOrder._id,json:async()=>body});
let response=await handlers.GET(request());assert.equal((await response.json()).data.status,'Pending');
response=await handlers.PATCH(request({orderId:scopedOrder._id,revision:-1,items:[input('a','Not Packed',5)]}));assert.equal(response.status,200);assert.equal((await response.json()).data.status,'In Progress');
response=await handlers.PATCH(request({orderId:scopedOrder._id,revision:0,items:[input('b','Fully Packed',0)]}));assert.equal((await response.json()).data.status,'Completed');assert.equal(docs[0].history.length,2);
assert.equal((await handlers.PATCH(request({orderId:scopedOrder._id,revision:0,items:[input('a','Not Packed',1)]}))).status,409);
assert.equal((await handlers.PATCH(request({orderId:scopedOrder._id,revision:1,items:[input('a','Not Packed',99)]}))).status,400);
identity.permissions=['view'];assert.equal((await handlers.PATCH(request({}))).status,403);
identity.permissions=[];assert.equal((await handlers.GET(request())).status,403);
console.log('PDI API: passed (read, create, merge update, audit, revision conflict, validation and permission denial with mocked persistence).');
// Awaiting approval uses PDI permissions and submitted-only scoped reads.
identity.permissions=['view'];
const submitted={...scopedOrder,panelStatus:'Submitted',isDraft:false,plantRows:[]};
assert.throws(()=>mergeInspection(submitted,null,[input('a','Not Packed',0)]));
for(const name of ['awaiting-orders','order-view']) {
 const text=fs.readFileSync(new URL(`../src/app/api/pdi-panel/${name}/route.js`,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export const /g,'const ');
 let checked=false;
 const scoped=(user,filter)=>{assert.equal(filter.panelStatus,'Submitted');assert.deepEqual(filter.isDraft,{$ne:true});checked=true;return filter;};
 const loader=new Function('NextResponse','mongoose','withAuth','withBranchAccess','connectDb','companyScopeFilter','OrderPanel','ORDER_VIEW_SELECT','orderReadView',text+';return GET;');
 const gate=(fn,opts)=>async req=>{assert.equal(opts.module,'PDI Panel');return identity.permissions.includes(opts.action)?fn(req,null,identity):Response.json({success:false},{status:403});};
 const route=loader({json:(...args)=>Response.json(...args)},{isValidObjectId:id=>/^[a-f\d]{24}$/.test(id)},gate,fn=>fn,async()=>{},scoped,{find:()=>query([submitted]),findOne:()=>query(submitted)},'orderPanelNo',value=>value);
 const response=await route(request());assert.equal(response.status,200);assert.equal(checked,true);
 identity.permissions=[];assert.equal((await route(request())).status,403);identity.permissions=['view'];
}
console.log('PDI awaiting approval: passed (PDI-only view authorization, submitted/non-draft query, scoped preview, inspection blocked before approval).');
