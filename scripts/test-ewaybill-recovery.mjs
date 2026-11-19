import assert from 'node:assert/strict';
import { recoverEwaybill, ewaybillStatusMethod } from '../src/lib/ewaybill-recovery.mjs';

const payload={company:'A',gstin:'GST',external_id:'LR',source_company_id:'company1',source_company_code:'A',lr:{privateSource:'not needed for status'}};
async function check(state,result) {
  return recoverEwaybill({call:async(method,args)=>{assert.equal(method,'app.status');assert.equal(args.lr,undefined);assert.equal(args.source_company_id,'company1');return {state,result,requestName:'request1'};}},'app.status',payload);
}
for(const state of ['Ready','Draft'])assert.equal((await check(state)).patch['ewaybill.apiState'],'idle');
for(const state of ['Processing','Uncertain','Unexpected'])assert.equal((await check(state)).patch['ewaybill.apiState'],'uncertain');
const issued={ewaybillNo:'123456789012',expiryDate:'2099-01-01T23:59:00+05:30',distance:175};
const recovered=(await check('Generated',issued)).patch;
assert.equal(recovered['ewaybill.apiState'],'complete');assert.equal(recovered['ewaybill.distance'],175);
assert.equal((await check('Generated',{...issued,expiryDate:'invalid'})).patch['ewaybill.apiState'],'uncertain');
assert.equal((await check('Generated',{})).patch['ewaybill.apiState'],'uncertain');
await assert.rejects(recoverEwaybill({call:async()=>{throw new Error('Forbidden');}},'app.status',payload));
assert.equal(ewaybillStatusMethod({FRAPPE_EWAYBILL_GENERATE_METHOD:'jaya_integration.api.ewaybill.generate'}),'jaya_integration.api.ewaybill.status');
assert.equal(ewaybillStatusMethod({FRAPPE_EWAYBILL_STATUS_METHOD:'custom.check'}),'custom.check');
assert.equal(ewaybillStatusMethod({FRAPPE_EWAYBILL_GENERATE_METHOD:'custom.unknown'}),'');
console.log('PASS persisted-state recovery, issued-bill recovery, distance, unknown outcomes and denied/unreachable status.');
