import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const parser=createRequire(import.meta.url)('@babel/parser');
const {canUseMasterPermission}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('src/lib/masterPermissionRegistry.js','utf8')).toString('base64'));
const page=fs.readFileSync('src/app/(dashboard)/admin/rate-master/create/page.jsx','utf8');
parser.parse(page,{sourceType:'module',plugins:['jsx']});
assert(page.includes("const canDelete = canUseMasterPermission(user,'Rate Master','delete')"));
assert(page.includes('{canDelete && <button'));
const source=fs.readFileSync('src/app/api/rate-master/route.js','utf8');
const ast=parser.parse(source,{sourceType:'module'});
const handler=ast.program.body.find(n=>n.type==='ExportNamedDeclaration' && n.declaration?.id?.name==='DELETE').declaration;
const makeHandler=new Function('connectDb','validateUser','NextResponse','RateMaster','Location','RateHistory',`return ${source.slice(handler.start,handler.end)}`);
const cases=[
  [{type:'company'},true],
  [{type:'user',roles:['Admin']},true],
  [{type:'user',modules:{'Rate Master':{selected:true,permissions:{delete:true}}}},true],
  [{type:'user',modules:{'Rate Master':{selected:true,permissions:{edit:true}}}},false],
  [{type:'user',modules:{'Rate Master':{selected:false,permissions:{delete:true}}}},false],
  [{type:'user',modules:{Suppliers:{selected:true,permissions:{delete:true}}}},false],
];
for(const [actor,allowed] of cases){
  let reads=0,writes=0;
  const user={...actor,id:'actor',companyId:'company'};
  const Model={findOne(filter){reads++;assert.equal(filter.companyId,'company');return {setOptions:async()=>({_id:'master',locationRates:[]})};},async findOneAndDelete(filter){assert.deepEqual(filter,{_id:'master',companyId:'company'});writes++;return {_id:'master'};}};
  const handler=makeHandler(async()=>{},async(req,action)=>{assert.equal(action,'delete');return canUseMasterPermission(user,'Rate Master',action)?{user}:{error:'Forbidden',status:403};},{json:(body,options)=>({body,status:options.status})},Model,{},{});
  const result=await handler({url:'http://localhost/api/rate-master?id=master'});
  assert.equal(result.status,allowed?200:403);
  assert.equal(reads,allowed?1:0);
  assert.equal(writes,allowed?1:0);
}
console.log('PASS: Rate Master delete handler allows Company/Admin/delete-authorized staff, denies edit-only/unselected/other-module staff before database access, and scopes deletion to company. UI parses and uses the same permission. Offline; no database changes.');
