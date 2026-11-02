import assert from 'node:assert/strict';
import fs from 'node:fs';
const business=file=>fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const rules=new Function(business('src/lib/paymentRules.js')+'\nreturn {summarizeAdvances,deriveBalanceFields,buildAdjustments};')();
const payment={paymentNo:'ADV-0009',purchaseNo:'PUR-0013',queueGenerated:true,status:'Approved',paymentDetails:{paymentStatus:'Approved',finalAmount:38704},vendorDetails:{advance:42000}};
let summary=rules.summarizeAdvances([payment]);
assert.equal(summary.advance,38704);assert.equal(summary.pendingAdvance,0);assert.equal(payment.paymentDetails.paymentStatus,'Approved','Counting a queue never marks it paid');
assert.equal(rules.summarizeAdvances([{...payment,queueGenerated:false}]).advance,0);
assert.equal(rules.summarizeAdvances([{...payment,paymentDetails:{...payment.paymentDetails,paymentStatus:'Rejected'}}]).advance,0);
for(const paymentStatus of ['Paid','Completed'])assert.equal(rules.summarizeAdvances([{...payment,paymentDetails:{...payment.paymentDetails,paymentStatus}}]).advance,38704,'Settled queued advance is counted once');
const pod={podNo:'POD-1',purchaseNo:'PUR-0013',vendorFinancial:{total:52500,podDeduction:500}};
let fields=rules.deriveBalanceFields(pod,summary.advance);
assert.equal(fields.podDeduction,500);assert.equal(fields.finalBalance,13296,'POD deduction is applied after queued advance');
const adjusted=rules.buildAdjustments({purchaseDetails:{advance:42000},additions:[{amount:200}],deductions:[{amount:1000}]},{loadedWeighment:{loadingCharges:2496}});
fields=rules.deriveBalanceFields(pod,summary.advance,adjusted);
assert.equal(fields.finalBalance,10000,'Existing PO/warehouse/POD adjustment formula remains unchanged');
const tenant={companyId:'company',activeOperatingCompanyId:'operating'};
const deps={...rules,companyScopeFilter:(user,query)=>({...query,companyId:user.companyId,subCompanyId:user.activeOperatingCompanyId}),
  AdvancePayment:{find:query=>{assert.equal(query.companyId,'company');assert.equal(query.subCompanyId,'operating');assert.deepEqual(query.isDraft,{$ne:true});return {select:()=>({lean:async()=>[payment]})};}},
  POD:{findOne:()=>({lean:async()=>pod})},PurchasePanel:{findOne:()=>({lean:async()=>null})},LoadingPanel:{},
};
const service=new Function(...Object.keys(deps),business('src/lib/advanceSettlement.js')+'\nreturn {getPaidAdvanceForPurchase,getAdvanceSummaryMap,deriveBalanceForPod};')(...Object.values(deps));
assert.equal((await service.getPaidAdvanceForPurchase(tenant,'PUR-0013')).advance,38704);
assert.equal((await service.getAdvanceSummaryMap(tenant,['PUR-0013'])).get('PUR-0013').advance,38704);
assert.equal((await service.deriveBalanceForPod(tenant,'POD-1')).fields.finalBalance,13296);
console.log('PASS: generated advance counts in shared POD and Balance queries before Paid; unqueued/rejected advances excluded, no double counting after settlement, net amount and existing POD/PO/warehouse deductions preserved, tenant/draft query filters retained. Offline; no database changes.');
