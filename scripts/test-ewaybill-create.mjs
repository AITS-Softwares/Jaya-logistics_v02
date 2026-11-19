import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), parser = require('@babel/parser');
const source = fs.readFileSync('src/app/(dashboard)/admin/Consignment-Note/create/page.jsx','utf8');
const ast = parser.parse(source,{sourceType:'module',plugins:['jsx']});
let handler;
function walk(node) { if(!node || typeof node !== 'object')return; if(node.type==='VariableDeclarator' && node.id?.name==='handleSave')handler=node.init; for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value && typeof value==='object')walk(value); }
walk(ast);
let calls=[], pushes=[], conflict, failure, alertMessage;
const scope={
 saveInFlight:{current:false},createdNoteIdRef:{current:null},
 setExistingLrConflict:value=>conflict=value,
 header:{partyName:'Party',vendorName:'Vendor'},orderRows:[],orderRowInfo:[],selectedRowId:'row1',ewaybill:{status:'To Be Generated',ewaybillNo:''},
 ewbScan:'idle',setSaving(){},localStorage:{getItem:()=> 'token'},window:{location:{search:''}},URLSearchParams,
 consignor:{},consignee:{},invoice:{file:{filePath:'invoice.pdf'}},palletizationRows:[],uniformRows:[],looseCargoRows:[],nonUniformRows:[],calculateTotalActualWt:()=>1,vehicleNegotiationData:null,
 console:{log(){},error(){}},alert:message=>alertMessage=message,router:{push:url=>pushes.push(url)},
 fetch:async(url,options)=>{calls.push({url,...options});return {ok:!failure,headers:{get:()=> 'application/json'},json:async()=>failure || ({success:true,data:{_id:'saved-lr',lrNo:'LR1'}})};}
};
const save = new Function(...Object.keys(scope),'return '+source.slice(handler.start,handler.end))(...Object.values(scope));
assert.equal(await save('draft'),'saved-lr');
assert.equal(calls[0].method,'POST');assert.equal(JSON.parse(calls[0].body).saveMode,'draft');
assert.deepEqual(pushes,['/admin/Consignment-Note']);
await save('draft');assert.equal(calls[1].method,'PUT');assert.equal(JSON.parse(calls[1].body).id,'saved-lr');assert.deepEqual(pushes,['/admin/Consignment-Note','/admin/Consignment-Note']);
await save('draft');assert.equal(calls[2].method,'PUT');assert.deepEqual(pushes,['/admin/Consignment-Note','/admin/Consignment-Note','/admin/Consignment-Note']);
assert.equal(scope.saveInFlight.current,false);
assert(!ast.program.body.some(n=>n.type==='ImportDeclaration' && n.source.value==='@/components/EwaybillDocuments'),'Create must not import ERPNext action controls');
assert(!source.slice(handler.start).includes("onClick={() => handleSave('submit')}"),'Approval submission belongs on Edit');
scope.createdNoteIdRef.current=null;
failure={success:false,code:'ORDER_ROW_LR_EXISTS',message:'Draft LR already exists',existingNote:{id:'existing-draft',lrNo:'LR2',isDraft:true}};
const navigations=pushes.length;
await save('draft');
assert.match(alertMessage,/Draft LR already exists/);
assert.equal(conflict.id,'existing-draft');assert.equal(scope.createdNoteIdRef.current,null);
assert.equal(scope.saveInFlight.current,false);assert.equal(pushes.length,navigations,'Conflicts must not overwrite or open another LR automatically');
console.log('PASS Save LR and Save as Draft return to the list, repeated saves reuse the LR, Create has no ERPNext/submit actions, conflicts preserve existing records.');
