import assert from 'node:assert/strict';
import fs from 'node:fs';
import mongoose from 'mongoose';
import * as policy from '../src/lib/masterApprovalPolicy.mjs';
import * as slabs from '../src/lib/rateSlabValidation.mjs';
const business=file=>fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export (default )?/gm,'');
const {addMasterApprovalFields}=new Function('mongoose',business('src/lib/masterApprovalSchema.js')+'\nreturn {addMasterApprovalFields};')(mongoose);
const Model=new Function('mongoose','addMasterApprovalFields',business('src/models/SupplierModels.js')+'\nreturn Supplier;')(mongoose,addMasterApprovalFields);
let current,writes=0;
const deps={...policy,...slabs,mongoose:{...mongoose,startSession:async()=>({withTransaction:async fn=>{const before=current.toObject();try{await fn();}catch(error){current=new Model(before);throw error;}},endSession:async()=>{}})}};
const {reviewMaster,submitMasterChange}=new Function(...Object.keys(deps),business('src/lib/masterApprovalService.js')+'\nreturn {reviewMaster,submitMasterChange};')(...Object.values(deps));
const maker={type:'user',id:String(new mongoose.Types.ObjectId())},company={type:'company',id:String(new mongoose.Types.ObjectId())};
Model.findOne=filter=>({setOptions(){return this;},session:async()=>String(filter.companyId)===String(current.companyId)?new Model(current.toObject()):null});
Model.findOneAndUpdate=async(filter,update,options)=>{
  assert.equal(options.runValidators,true,'Update validators remain enabled');
  assert.equal(filter.revisionId,current.revisionId);
  const next=new Model(current.toObject());
  for(const [path,value]of Object.entries(update.$set || {}))next.set(path,value);
  for(const [path,value]of Object.entries(update.$inc || {}))next.set(path,(next.get(path)||0)+value);
  const log=update.$push?.approvalLog;if(log)next.approvalLog.push(...(log.$each || [log]));
  // Mongoose update validation applies to updated paths, not every business field.
  await next.validate(Object.keys(update.$set || {}));
  current=next;writes++;return current;
};
const reset=(actor=maker)=>{current=new Model({companyId:company.id,supplierCode:'SUPP-40',supplierName:'Existing supplier',supplierGroup:'Service',gstCategory:'Unregistered',pan:'ABCDE1234F',documents:{panCard:'/saved-pan.pdf'},...policy.initialApproval(maker,new Date(),'revision'),submittedBy:policy.identity(actor),createdAt:new Date(1),updatedAt:new Date(1)});writes=0;};
const review=(actor,action,reason,revisionId=current.revisionId)=>reviewMaster({Model,id:current._id,companyId:current.companyId,user:actor,kind:'supplier',action,revisionId,reason});
try{
  reset();
  await assert.rejects(current.validate(),/Due days are required/,'Reproduce the actual Supplier schema error');
  await assert.rejects(review(company,'approve'),error=>error.status===400 && /Due days are required/.test(error.message) && /Edit the record/.test(error.message));
  assert.equal(writes,0);assert.equal(current.approvalStatus,'Pending');assert.equal(current.dueDays,undefined);
  await assert.rejects(review(company,'reject',''),/reason/);
  await assert.rejects(review(maker,'reject','Needs correction'),/own submission/);
  await assert.rejects(review(company,'reject','Needs correction','stale'),/Refresh/);
  await review(company,'reject','Enter the agreed payment due days');
  assert.equal(current.approvalStatus,'Rejected');assert.equal(current.dueDays,undefined);
  assert.equal(current.documents.panCard,'/saved-pan.pdf');
  assert.equal(current.approvalLog.at(-1).action,'REJECTED');
  await submitMasterChange({Model,record:current,input:{dueDays:0},user:maker,kind:'supplier'});
  assert.equal(current.approvalStatus,'Pending');assert.equal(current.dueDays,0);
  await review(company,'approve');assert.equal(current.approvalStatus,'Approved');
  reset(company);await review(company,'reject','Correct due days');assert.equal(current.approvalStatus,'Rejected','Company self-rejection still works with incomplete records');
  reset();current.approvalStatus='Approved';current.approvalVersion=1;
  current.pendingChange={revisionId:'proposal',baseVersion:1,requestedBy:policy.identity(maker),requestedAt:new Date(),data:{bankName:'Proposed bank'}};
  await review(company,'reject','Check bank','proposal');
  assert.equal(current.approvalStatus,'Approved');assert.equal(current.pendingChange,null);
  assert.equal(current.bankName,undefined);assert.equal(current.lastRejectedProposal.data.bankName,'Proposed bank');
  console.log('PASS: real Supplier schema missing-dueDays reproducer; incomplete rejection and Company self-rejection succeed, approval reports actionable 400 without writes, attachments/live data preserved, valid zero-day resubmission approves, stale/reason/staff checks retained. Offline; no database changes.');
}finally{mongoose.deleteModel(Model.modelName);}
