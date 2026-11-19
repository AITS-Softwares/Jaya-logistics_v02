import assert from 'node:assert/strict';
import { ewaybillData, resolveParty, addressPartyFields } from '../src/lib/ewaybill-data.mjs';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildEwaybillPayload } from '../src/lib/ewaybill-preview.mjs';
import { statutorySnapshot } from '../src/lib/ewaybill-validation.mjs';
import { gstStateCode } from '../src/lib/gst-states.mjs';

const customer = {_id:'customer1',billingAddresses:[{title:'Registered',address1:'Street 1',address2:'',city:'Pune',state:'Maharashtra',pin:'411001',gstNumber:'27AAAAA0000A1Z5'}]};
const party = resolveParty({customerId:'customer1',name:'Supplier',address:'Street 1  Pune Maharashtra 411001'},[customer]);
assert.equal(party.gstNumber,'27AAAAA0000A1Z5');
assert.equal(party.city,'Pune');assert.equal(party.pinCode,'411001');
const noGstCustomer = {...customer,billingAddresses:[{...customer.billingAddresses[0],gstNumber:''}]};
const namedStateParty = resolveParty({customerId:'customer1',address:'Street 1  Pune Maharashtra 411001'},[noGstCustomer]);
assert.equal(namedStateParty.stateCode,'27','Customer Master state name supplies the code even without GSTIN');
const namedStates = ewaybillData({ewaybillData:{transactionType:'1'}},namedStateParty,namedStateParty);
assert.equal(namedStates.fromStateCode,'27');assert.equal(namedStates.actFromStateCode,'27');
assert.equal(namedStates.toStateCode,'27');assert.equal(namedStates.actToStateCode,'27');
assert.equal(gstStateCode('MAHARASHTRA'),'27');assert.equal(gstStateCode('Orissa'),'21');
assert.equal(gstStateCode('Unknown state'),'','Unknown states must not be guessed from city/PIN');
const legacy = resolveParty({name:'Supplier',address:'Street 1, Pune 411001'},[{...noGstCustomer,customerName:'Supplier'}]);
assert.equal(legacy.stateCode,'27','Legacy LR can resolve a unique customer name and address missing state text');
assert.equal(legacy.customerId,'customer1');
const ambiguous = {...noGstCustomer,billingAddresses:[...noGstCustomer.billingAddresses,{...noGstCustomer.billingAddresses[0],state:'Karnataka'}]};
assert.equal(resolveParty({customerId:'customer1',address:'Street 1, Pune 411001'},[ambiguous]).stateCode,undefined,'Ambiguous customer registrations must not be guessed');
assert.equal(resolveParty(party,[customer]),party,'Resolved party must stabilize, avoiding render loops');
const mismatched = resolveParty({customerId:'customer1',address:'Another registration'},[customer]);
assert.equal(mismatched.gstNumber,'','Do not apply the first registration to an unrelated address');
const invoice = {boeInvoice:'As Per Invoice',boeInvoiceNo:'INV1',boeInvoiceDate:'2026-11-01',invoiceValue:'105',extraction:{details:{items:[{description:'Fertilizer',hsn:'31026000',quantity:30,unit:'KG',taxableValue:100}],taxableValue:100,taxes:{igst:5}}},ewaybillData:{transactionType:'1'}};
let data = ewaybillData(invoice,party,party,{lrNo:'LR1',lrDate:'2026-11-02'});
assert.equal(data.transDistance,0,'Default distance requests automatic PIN-based calculation');
assert.equal(data.itemList.length,1);assert.equal(data.itemList[0].qtyUnit,'KGS');
assert.equal(data.totalValue,100);assert.equal(data.igstValue,5);
assert.equal(data.cgstValue,'','An unidentified tax is not assumed to be zero');
assert.equal(data.itemList[0].igstRate,'','Do not guess item tax rates from the total');
assert.equal(data.fromAddr1,'Street 1');assert.equal(data.fromPlace,'Pune');assert.equal(data.fromPincode,'411001');
assert.equal(data.fromStateCode,'27');assert.equal(data.transDocNo,'LR1');
invoice.ewaybillData = {...invoice.ewaybillData,taxTreatment:'igst',noCess:true,itemList:[{...data.itemList[0],igstRate:'5'}]};
data = ewaybillData(invoice,party,party);
assert.equal(data.cgstValue,0);assert.equal(data.sgstValue,0);assert.equal(data.cessValue,0);
assert.equal(data.itemList[0].igstRate,'5');
invoice.ewaybillData = {transactionType:'3'};
assert.equal(ewaybillData(invoice,party,party).fromAddr1,undefined,'Different dispatch address needs explicit confirmation');
const note = {_id:'a'.repeat(24),invoice,consignor:party,consignee:party,header:{vehicleNo:'MH12AB1234'}};
let payload = buildEwaybillPayload(note,{});
assert.equal(payload.lr.invoice.ewaybillData.itemList[0].productDesc,'Fertilizer');
assert.equal(payload.lr.invoice.extraction,undefined,'Provider payload excludes raw source text');
const before = statutorySnapshot(note);
note.invoice.extraction.details.items[0].quantity = 31;
assert.notDeepEqual(statutorySnapshot(note),before,'Changed extracted goods must invalidate statutory edits/confirmation');
invoice.ewaybillData = {itemList:[]};
assert.equal(ewaybillData(invoice).itemList.length,0,'An explicitly removed product list must stay removed');
// Exercise actual create/edit selection handlers: metadata must be retained at
// selection time rather than depending on a later effect matching text.
const parser = createRequire(import.meta.url)('@babel/parser');
for (const page of ['create','[id]']) {
  const source = fs.readFileSync(`src/app/(dashboard)/admin/Consignment-Note/${page}/page.jsx`,'utf8');
  const nodes = {};
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && ['extractAddressesFromCustomer','handleSelectConsignor','handleSelectConsignee','handleSelectConsignorAddress'].includes(node.id?.name)) nodes[node.id.name] = node.init;
    for (const value of Object.values(node)) Array.isArray(value) ? value.forEach(walk) : walk(value);
  }
  walk(parser.parse(source,{sourceType:'module',plugins:['jsx']}));
  const compile = (name,scope) => new Function(...Object.keys(scope),`return (${source.slice(nodes[name].start,nodes[name].end)})`)(...Object.values(scope));
  const extractAddressesFromCustomer = compile('extractAddressesFromCustomer',{addressPartyFields});
  let current;
  const scope = {addressPartyFields,extractAddressesFromCustomer,setConsignor:v => {current=typeof v === 'function' ? v(current) : v;},setConsignee:v => {current=typeof v === 'function' ? v(current) : v;},setConsignorAddresses(){},setConsigneeAddresses(){},setShowConsignorDropdown(){},setShowConsigneeDropdown(){},setShowConsignorAddressDropdown(){}};
  for (const name of ['handleSelectConsignor','handleSelectConsignee']) {
    compile(name,scope)({...noGstCustomer,customerName:'Supplier'});
    assert.equal(current.stateCode,'27',`${page}: ${name} must preserve the selected state`);
    assert.equal(current.state,'Maharashtra');
  }
  compile('handleSelectConsignorAddress',scope)(extractAddressesFromCustomer(noGstCustomer)[0]);
  assert.equal(current.stateCode,'27',`${page}: switching addresses preserves state`);
}
console.log('PASS extracted goods, NIC units, selected-address GSTIN/metadata, explicit tax treatment, totals, no invented rates, preview products and changed-goods protection.');
