import { destinationLabel } from '../src/lib/destination.mjs';
import { recordPaymentSettlement } from '../src/lib/paymentConfirmationRules.mjs';
import { unwrapBranchHandlers } from './route-business-source.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { advanceMaterialProjection, isAdvanceStatusUpdate, changedApprovedAdvanceBankFields } from '../src/lib/advancePaymentReview.mjs';

const require = createRequire(import.meta.url);
let payment;
let grants = new Set(['view', 'edit', 'approve', 'create']);
let liveAmountCalls = 0;
let notifications = 0;
let saved = 0;
const statuses = ['Pending', 'Approved', 'Rejected', 'Paid', 'Completed'];
const deps = {
  recordPaymentSettlement, maybeSendPaymentConfirmation: async () => null,
  NextResponse: { json: (body, options = {}) => ({ ...body, httpStatus: options.status || 200 }) },
  connectDb: async () => {}, validateUser: async () => ({ user: { id: 'user', companyId: 'company' } }),
  hasPermission: (_user, action) => grants.has(action), isValidObjectId: () => true, companyScopeFilter: (_user, query) => query,
  AdvancePayment: { findOne: async () => payment },
  PurchasePanel: { findOne: () => { const query = { select: () => query, lean: async () => ({ orderRows: [] }) }; return query; } },
  validateOpenOrderRows: async () => null, num: (value) => Number(value) || 0,
  ADVANCE_STATUSES: statuses, advanceMaterialProjection, isAdvanceStatusUpdate, changedApprovedAdvanceBankFields,
  liveOfficeNetEffect: async () => { liveAmountCalls++; return 23850; },
  syncPodAdvanceForPurchase: async () => {}, notifyModuleApprovers: async () => { notifications++; },
};
const api = unwrapBranchHandlers(fs.readFileSync('src/app/api/Advance-Payment/route.js', 'utf8'));
const putCode = api.slice(api.indexOf('\nexport async function PUT'), api.indexOf('\nexport async function DELETE')).replace('export async function PUT', 'async function PUT');
const put = new Function(...Object.keys(deps), `${putCode}\nreturn PUT;`)(...Object.values(deps));
const request = (body) => ({ json: async () => ({ id: 'payment', ...body }) });
function seed(status = 'Pending') {
  saved = 0;
  payment = {
    _id: 'payment', paymentNo: 'ADV-1', purchaseNo: 'PUR-1', status, isDraft: false,
    paymentDetails: { finalAmount: 23850, paymentStatus: status, remarks: 'Before', accountNoCredit: '1234567890' },
    vendorDetails: { advance: 25000 }, purchaseAmountFromVNN: 35000,
    memoFile: { filePath: '/memo.pdf' }, additions: { totalAddition: 200, items: [] }, deductions: { totalDeduction: 500, items: [] },
    async save() { saved++; }, toObject() { return JSON.parse(JSON.stringify(this)); },
  };
}
seed();
let result = await put(request({ expectedFinalAmount: 23850, paymentDetails: { paymentStatus: 'Approved', remarks: 'Reviewed' } }));
assert.equal(result.httpStatus, 200);
assert.equal(payment.paymentDetails.finalAmount, 23850);
assert.equal(payment.paymentDetails.paymentStatus, 'Approved');
assert.equal(payment.paymentDetails.remarks, 'Reviewed');
assert.equal(liveAmountCalls, 0, 'A status-only approval must never recalculate payable amounts');
assert.equal(payment.status, 'Pending', 'Point 4 is intentionally left unchanged in this task');
seed();
result = await put(request({ expectedFinalAmount: 10000, paymentDetails: { paymentStatus: 'Approved' } }));
assert.equal(result.httpStatus, 409);
assert.equal(saved, 0);
seed(); grants = new Set(['view', 'approve']);
result = await put(request({ expectedFinalAmount: 23850, paymentDetails: { paymentStatus: 'Approved' } }));
assert.equal(result.httpStatus, 200);
result = await put(request({ paymentDetails: { paymentStatus: 'Approved', finalAmount: 1 } }));
assert.equal(result.httpStatus, 403, 'Approve-only users cannot modify amounts');
seed(); grants = new Set(['view', 'edit']);
result = await put(request({ paymentDetails: { paymentStatus: 'Approved' } }));
assert.equal(result.httpStatus, 403);
grants = new Set(['view', 'edit', 'approve', 'create']);
seed('Approved');
result = await put(request({ paymentDetails: { accountNoCredit: '9999999999' } }));
assert.equal(result.httpStatus, 409, 'Approved bank details must be locked on the API');
assert.equal(payment.paymentDetails.accountNoCredit, '1234567890');
assert.equal(saved, 0);
result = await put(request({ vendorDetails: { ifsc: 'TEST0000001' } }));
assert.equal(result.httpStatus, 409, 'Lock the vendor bank copy as well as the payment bank copy');
seed();
result = await put(request({ paymentDetails: { accountNoCredit: '9999999999' } }));
assert.equal(result.httpStatus, 200, 'Bank corrections remain possible before approval');
assert.equal(payment.paymentDetails.accountNoCredit, '9999999999');
seed('Approved');
result = await put(request({ memoFile: { filePath: '/new-memo.pdf' } }));
assert.equal(result.httpStatus, 200);
assert.equal(payment.paymentDetails.paymentStatus, 'Pending', 'Material edits invalidate the previous approval');
assert.equal(payment.status, 'Pending');
assert.equal(notifications, 1);
seed('Approved');
result = await put(request({ memoFile: { filePath: '/memo.pdf' } }));
assert.equal(result.httpStatus, 200);
assert.equal(payment.paymentDetails.paymentStatus, 'Approved', 'An unchanged save should retain approval');
seed('Approved'); payment.bankIntegration = { provider: 'ICICI_CIB' }; payment.queueGenerated = true;
assert.equal((await put(request({ paymentDetails: { paymentStatus: 'Paid' } }))).httpStatus, 409);
assert.equal(saved, 0);
seed('Paid');
assert.equal((await put(request({ paymentDetails: { paymentStatus: 'Pending' } }))).httpStatus, 400);
seed(); payment.isDraft = true;
assert.equal((await put(request({ paymentDetails: { paymentStatus: 'Approved' } }))).httpStatus, 400);

// Recreated subdocument IDs and equivalent numeric strings do not invalidate approval.
assert.deepEqual(advanceMaterialProjection({ orderRows: [{ _id: 'a', weight: '10' }] }), advanceMaterialProjection({ orderRows: [{ _id: 'b', weight: 10 }] }));
const model = fs.readFileSync('src/app/api/Advance-Payment/AdvancePayment.js', 'utf8');
const hook = model.match(/^advancePaymentSchema\.pre\('save', (function\(next\) \{[\s\S]*?^\})\);/m)?.[1];
assert(hook);
const beforeSave = new Function('num', `return (${hook});`)((value) => Number(value) || 0);
const zero = { orderRows: [], additions: { items: [] }, deductions: { items: [] }, vendorDetails: { advance: 25000 }, paymentDetails: { finalAmount: 0 } };
beforeSave.call(zero, () => {});
assert.equal(zero.paymentDetails.finalAmount, 0, 'Saving an approval must preserve an explicitly zero payable amount');

// Render the actual Orders table: every heading must have a matching charge cell.
const page = fs.readFileSync('src/app/(dashboard)/admin/Advance-Payment/approve/[id]/page.jsx', 'utf8');
const tableCode = page.slice(page.indexOf('\nfunction OrdersTable'), page.indexOf('\nasync function openAdvanceMemo'));
const swc = await require('next/dist/build/swc').loadBindings();
const compiled = await swc.transform(tableCode, { filename: 'orders.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
const React = require('react');
const Table = new Function('React', 'destinationLabel', `${compiled.code}\nreturn OrdersTable;`)(React, destinationLabel);
const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Table, { rows: [{ _id: 'row', collectionCharges: '120', cancellationCharges: 'Nil', loadingCharges: '300', otherCharges: '45' }] }));
assert.equal((html.match(/<th(?:\s|>)/g) || []).length, 16);
assert.equal((html.match(/<td(?:\s|>)/g) || []).length, 16);
for (const value of ['₹120', 'Nil', '300', '₹45']) assert(html.includes(value));
// Render the complete approval screen with the reported amounts and bank lock.
const screenCode = page.replace(/^import .*;\r?\n/gm, '').replace(/^export default function ApproveAdvancePayment/m, 'function ApproveAdvancePayment');
const screenCompiled = await swc.transform(screenCode, { filename: 'approval.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
let hookIndex = 0;
let lockReason = '';
const values = [false, false, '', null, 'ADV-1', 'Company', {}, {}, [], {}, 35000, null,
  { advance: 25000 }, { items: [], totalAddition: 200 }, { items: [], totalDeduction: 500 },
  { finalAmount: 23850, paymentStatus: 'Pending' }, 'Pending', 'Review', 850];
const Screen = new Function('React', 'useState', 'useEffect', 'useRouter', 'useParams', 'usePermission', 'destinationLabel', 'PaymentConfirmationPanel', `${screenCompiled.code}\nreturn ApproveAdvancePayment;`)(
  React, (initial) => { const index = hookIndex++; return [index === 2 ? lockReason : index < values.length ? values[index] : initial, () => {}]; },
  () => {}, () => ({ push() {} }), () => ({ id: 'payment' }), () => ({ hasPermission: () => true, loading: false }), destinationLabel, () => null,
);
let screenHtml = require('react-dom/server').renderToStaticMarkup(React.createElement(Screen));
assert(screenHtml.includes('₹23,850'));
assert(screenHtml.includes('Final Advance Amount'));
for(const label of ['Advance Amount with Adjustment','Deduct at Warehouse:','Advance (Generate Queue):','No deduction item details recorded.'])assert(screenHtml.includes(label));
assert(screenHtml.includes('₹850'));
assert(/Total Deductions:[\s\S]*?₹500/.test(screenHtml),'Saved deductions show even without item details');
values[14].items=[{description:'Shortage adjustment',amount:500}];hookIndex=0;
screenHtml=require('react-dom/server').renderToStaticMarkup(React.createElement(Screen));
assert(screenHtml.includes('Shortage adjustment'));
values[18]=850.75;values[15].finalAmount=23849.25;hookIndex=0;
screenHtml=require('react-dom/server').renderToStaticMarkup(React.createElement(Screen));
assert(screenHtml.includes('₹850.75'));assert(screenHtml.includes('₹23,849.25'),'Display preserves paise');
lockReason = 'This payment has been submitted to the bank.';
hookIndex = 0;
screenHtml = require('react-dom/server').renderToStaticMarkup(React.createElement(Screen));
assert(screenHtml.includes(lockReason));
assert(/<button[^>]*disabled=""[^>]*>Update Status<\/button>/.test(screenHtml), 'Bank-submitted payments must disable Update Status');
// Execute the actual loader to ensure warehouse deduction reaches approval state.
const parser=require('@babel/parser');
const ast=parser.parse(page,{sourceType:'module',plugins:['jsx']});
const component=ast.program.body.find(node=>node.type==='ExportDefaultDeclaration').declaration;
const loader=component.body.body.flatMap(node=>node.declarations || []).find(node=>node.id.name==='fetchPaymentData').init;
const loaderCode=page.slice(loader.start,loader.end),loaded={};
const loaderDeps={paymentId:'payment',localStorage:{getItem:()=>''},fetch:async()=>({ok:true,json:async()=>({success:true,data:{warehouseDeduction:850.75,deductions:{totalDeduction:500,items:[{description:'Shortage adjustment',amount:500}]}}})}),num:value=>Number(value)||0,console:{log(){},error(){}},alert:message=>assert.fail(message)};
for(const name of new Set([...loaderCode.matchAll(/\b(set[A-Z]\w*)\(/g)].map(match=>match[1])))loaderDeps[name]=value=>loaded[name]=value;
await new Function(...Object.keys(loaderDeps),'return '+loaderCode)(...Object.values(loaderDeps))();
assert.equal(loaded.setWarehouseDeduction,850.75);assert.equal(loaded.setDeductions.totalDeduction,'500');
assert.equal(loaded.setDeductions.items[0].description,'Shortage adjustment');
console.log('PASS: actual approval loader/render shows deduction details, saved totals, warehouse deduction, adjustment summary and paise; reviewed amounts, stale review, permissions and bank/settled/draft locks remain protected.');
