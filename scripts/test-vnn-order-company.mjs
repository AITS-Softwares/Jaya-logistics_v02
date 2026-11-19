import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {normalizeVnnOrderPanel,vnnCompanyId} from '../src/lib/vnn-order-company.mjs';
const require=createRequire(import.meta.url),parser=require('@babel/parser');
const source=fs.readFileSync('src/app/(dashboard)/admin/vehicle-negotiation/create/page.jsx','utf8');
const ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});
function find(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const child of Object.values(node)){for(const item of Array.isArray(child)?child:[child]){const result=find(item,predicate);if(result)return result}}}
const dropdown=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='MultiSelectOrderPanelDropdown');
const selectNode=find(dropdown,n=>n.type==='VariableDeclarator'&&n.id.name==='handleSelectPanel').init;
const callbackNode=find(ast,n=>n.type==='VariableDeclarator'&&n.id.name==='handleOrderPanelSelect').init.arguments[0];
const detail={_id:'order1',orderPanelNo:'ORDER1',subCompanyId:{_id:'companyA',name:'Jaya Logistics',code:'JL'},plantRows:[]};
const list={_id:'order2',orderPanelNo:'ORDER2',subCompanyId:'companyA',subCompanyName:'Jaya Logistics',plantRows:[]};
const first=normalizeVnnOrderPanel(detail);
assert.equal(first.subCompanyId,'companyA');assert.equal(first.subCompanyName,'Jaya Logistics');assert.equal(first.subCompanyCode,'JL');assert.equal(detail.subCompanyId._id,'companyA');
assert.equal(vnnCompanyId(null),null);assert.equal(vnnCompanyId({_id:'companyA'}),'companyA');assert.equal(vnnCompanyId({name:'Jaya Logistics'}),null);
for(const initial of [first,detail]){
 let added=[],alerts=[],fetched=0;
 const scope={selectedPanels:[initial],selectedOrderNos:new Set(['order1']),normalizeOrderNo:v=>String(v||'').trim().toLowerCase(),vnnCompanyId,selectionInProgressRef:{current:false},setSearchQuery(){},setLoading(){},setPanels(){},setShowDropdown(){},alert:message=>alerts.push(message),console,orderPanelSearch:{getOrderPanelById:async()=>{fetched++;return normalizeVnnOrderPanel(list)}},onSelect:panel=>added.push(panel)};
 const select=new Function(...Object.keys(scope),'return '+source.slice(selectNode.start,selectNode.end))(...Object.values(scope));
 await select(list);assert.equal(added.length,1);assert.equal(alerts.length,0);assert.equal(fetched,1);
 await select({...list,subCompanyId:'companyB'});assert.equal(added.length,1);assert.equal(fetched,1);assert.match(alerts.at(-1),/same sub-company/);
 await select(detail);assert.equal(added.length,1);assert.match(alerts.at(-1),/already included/);assert.equal(scope.selectionInProgressRef.current,false);
}
let appended=[],alerts=[];
const scope={normalizeVnnOrderPanel,vnnCompanyId,selectedOrderPanels:[first],plants:[],customerSearch:{customers:[]},setSelectedOrderPanels:fn=>{appended=fn([first])},setHeader:fn=>fn({}),setOrders(){},console:{log(){}},alert:message=>alerts.push(message)};
const add=new Function(...Object.keys(scope),'return '+source.slice(callbackNode.start,callbackNode.end))(...Object.values(scope));
await add({...list,subCompanyId:{_id:'companyA',name:'Jaya Logistics'}});assert.equal(appended.length,2);assert.equal(appended[1].subCompanyId,'companyA');assert.equal(alerts.length,0);
await add({...list,subCompanyId:{_id:'companyB',name:'Jaya Logistics'}});assert.equal(appended.length,2);assert.match(alerts.at(-1),/same sub-company/);
await add({...list,subCompanyId:null});assert.match(alerts.at(-1),/no sub-company/);
console.log('PASS real VNN dropdown and form handlers: table object IDs and toolbar scalar IDs can add same-company orders; other companies, missing company and duplicate orders remain blocked.');
