import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const records={suppliers:[{supplierCode:'SUPP-1',companyId:'A'},{supplierCode:'SUPP-2',companyId:'A',approvalStatus:'Pending'},{supplierCode:'SUPP-3',companyId:'A',approvalStatus:'Rejected'}],ratemasters:[{title:'Old'},{title:'Pending',approvalStatus:'Pending'}]};
let mutations=0;
const touched=[];
const matches=(row,filter)=>Object.entries(filter).every(([key,value])=>value.$exists!==undefined?(value.$exists?key in row:!(key in row)) && (!value.$nin || !value.$nin.includes(row[key])):true);
const db={collection(name){touched.push(name);return {aggregate(){return {async toArray(){return [];}};},async countDocuments(filter){return records[name].filter(row=>matches(row,filter)).length;},async updateMany(filter,update){let modifiedCount=0;for(const row of records[name]){if(!matches(row,filter))continue;if(Array.isArray(update))row.reservedSupplierCode=row.supplierCode;else{Object.assign(row,update.$set);if(update.$push?.approvalLog)(row.approvalLog ||= []).push(update.$push.approvalLog);}modifiedCount++;mutations++;}return {modifiedCount};},async createIndex(){mutations++;}};}};
async function run(apply,only){const context=vm.createContext({process:{argv:['node','migration','--db=TEST_ONLY',...(apply?['--apply']:[]),...(only?[`--only=${only}`]:[])],env:{MASTER_APPROVAL_MONGO_URI:'not-a-real-connection'}},console:{log(){}},Date,Error});const fake={connection:{name:'TEST_ONLY',db},async connect(){},async disconnect(){}};const mongo=new vm.SyntheticModule(['default'],function(){this.setExport('default',fake);},{context});const script=new vm.SourceTextModule(fs.readFileSync('scripts/migrate-master-approval.mjs','utf8'),{context});await script.link(()=>mongo);await script.evaluate();}
await run(false);assert.equal(mutations,0);
await run(true);
assert.equal(records.suppliers[0].approvalStatus,'Approved');
assert.equal(records.suppliers[1].approvalStatus,'Pending');assert.equal(records.suppliers[2].approvalStatus,'Rejected');
assert.equal(records.ratemasters[0].approvalLog[0].action,'GRANDFATHERED');
await run(true);assert.equal(records.suppliers[0].approvalLog.length,1);assert.equal(records.ratemasters[0].approvalLog.length,1);
console.log('PASS: migration dry-run makes no changes; apply grandfathers missing-only; Pending/Rejected and audit idempotence preserved (offline doubles).');

records.ratemasters.push({title:'Another legacy rate'});
const suppliersBefore=JSON.stringify(records.suppliers);
touched.length=0;
await run(false,'ratemasters');
assert(touched.every(name=>name==='ratemasters'));
touched.length=0;
await run(true,'ratemasters');
assert(touched.every(name=>name==='ratemasters'));
assert.equal(JSON.stringify(records.suppliers),suppliersBefore);
assert.equal(records.ratemasters.at(-1).approvalStatus,'Approved');
assert.equal(records.ratemasters[1].approvalStatus,'Pending');
console.log('PASS: Rate Master-only preview/apply never reads or modifies suppliers.');
