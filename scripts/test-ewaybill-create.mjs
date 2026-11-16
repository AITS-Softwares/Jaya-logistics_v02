import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), parser = require('@babel/parser');
const source = fs.readFileSync('src/app/(dashboard)/admin/Consignment-Note/create/page.jsx','utf8');
const ast = parser.parse(source,{sourceType:'module',plugins:['jsx']});
let handler;
function walk(node) { if(!node || typeof node !== 'object')return; if(node.type==='VariableDeclarator' && node.id?.name==='handleSave')handler=node.init; for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value && typeof value==='object')walk(value); }
walk(ast);
let calls=[], pushes=[], savedId;
const scope={
 saveInFlight:{current:false},createdNoteIdRef:{current:null},setCreatedNoteId:id=>savedId=id,
 header:{partyName:'Party',vendorName:'Vendor'},orderRows:[],orderRowInfo:[],selectedRowId:'row1',ewaybill:{status:'To Be Generated',ewaybillNo:''},
 setSaving(){},localStorage:{getItem:()=> 'token'},window:{location:{search:''}},URLSearchParams,
 consignor:{},consignee:{},invoice:{file:{filePath:'invoice.pdf'}},palletizationRows:[],uniformRows:[],looseCargoRows:[],nonUniformRows:[],calculateTotalActualWt:()=>1,vehicleNegotiationData:null,
 console:{log(){},error(){}},alert(){},router:{push:url=>pushes.push(url)},
 fetch:async(url,options)=>{calls.push({url,...options});return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({success:true,data:{_id:'saved-lr',lrNo:'LR1'}})};}
};
const save = new Function(...Object.keys(scope),'return '+source.slice(handler.start,handler.end))(...Object.values(scope));
assert.equal(await save('draft',{stayOnPage:true}),'saved-lr');
assert.equal(savedId,'saved-lr');assert.equal(calls[0].method,'POST');assert.equal(JSON.parse(calls[0].body).saveMode,'draft');assert.equal(pushes.length,0);
await save('draft',{stayOnPage:true});assert.equal(calls[1].method,'PUT');assert.equal(JSON.parse(calls[1].body).id,'saved-lr');assert.equal(pushes.length,0);
await save('submit');assert.equal(calls[2].method,'PUT');assert.equal(JSON.parse(calls[2].body).saveMode,'submit');assert.deepEqual(pushes,['/admin/Consignment-Note']);
assert.equal(scope.saveInFlight.current,false);
console.log('PASS create-page autosave stays on screen, reuses the same LR via PUT, and final submit keeps the existing navigation.');
