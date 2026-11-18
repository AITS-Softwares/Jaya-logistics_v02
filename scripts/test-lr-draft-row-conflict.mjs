import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {lrRowConflict,isOrderRowDuplicate} from '../src/lib/lr-row-conflict.mjs';
const parser=createRequire(import.meta.url)('@babel/parser');
const source=fs.readFileSync('src/app/api/consignment-note/route.js','utf8');
const node=parser.parse(source,{sourceType:'module'}).program.body.find(n=>n.type==='FunctionDeclaration' && n.id.name==='branchHandlerPOST');
let record,simulatedError,reads=0;
const user={companyId:'tenant1',activeOperatingCompanyId:'operating1'};
const scope={connectDb:async()=>{},validateUser:async()=>({user}),identifierFormatError:()=>null,validateOpenOrderRows:async()=>null,
 console:{log(){},error(){}},NextResponse:{json:(body,opts)=>({body,status:opts?.status || 200})},
 companyScopeFilter:(u,filter)=>({...filter,companyId:u.companyId,subCompanyId:u.activeOperatingCompanyId}),
 ConsignmentNote:{findOne:query=>{reads++;assert.equal(query.companyId,'tenant1');assert.equal(query.subCompanyId,'operating1');assert.equal(query.orderRowId,'row1');if(simulatedError && reads===1)throw simulatedError;return {select:()=>({lean:async()=>record})};}},
 lrRowConflict,isOrderRowDuplicate};
const POST=new Function(...Object.keys(scope),`return (${source.slice(node.start,node.end)})`)(...Object.values(scope));
const request=saveMode=>({json:async()=>({saveMode,orderRowId:'row1',header:{}})});
for(const isDraft of [true,false])for(const mode of ['draft','submit']){
 reads=0;record={_id:'existing',lrNo:'LR1',isDraft,header:{status:isDraft?'Draft':'Pending'}};
 const result=await POST(request(mode));assert.equal(result.status,409);assert.equal(result.body.existingNote.id,'existing');assert.equal(result.body.existingNote.isDraft,isDraft);assert.equal(reads,1);
}
simulatedError={code:11000,keyPattern:{companyId:1,orderRowId:1},keyValue:{orderRowId:'row1'}};
reads=0;record={_id:'concurrent',lrNo:'LR2',isDraft:true};
assert.equal((await POST(request('draft'))).body.existingNote.id,'concurrent','Concurrent duplicate must identify the visible existing LR');
reads=0;record=null;
const hidden=await POST(request('draft'));assert.equal(hidden.status,409);assert.equal(hidden.body.existingNote,undefined,'Do not expose an inaccessible conflicting LR');
reads=0;simulatedError={code:11000,keyPattern:{companyId:1,lrNo:1}};
assert.equal((await POST(request('draft'))).body.message,'LR number already exists');
assert.equal(isOrderRowDuplicate({code:11000,message:'index: companyId_1_orderRowId_1 dup key'}),true);
console.log('PASS draft/submitted order-row uniqueness, correct duplicate classification, concurrent conflicts and scoped existing-record references.');
