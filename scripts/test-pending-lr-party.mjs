import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const source = fs.readFileSync('src/app/api/consignment-note/route.js', 'utf8');
const start = source.indexOf('      const normalize =', source.indexOf('\nexport async function GET'));
const end = source.indexOf('    // ============ CASE 1:', start);
const code = source.slice(start, end).replace(/\n    }\s*$/, '');
let orders = [{ orderPanelNo: 'OP-1', panelStatus: 'Approved', customerId: '507f1f77bcf86cd799439011', plantRows: [{ _id: 'drop-1', toName: 'Koregaon', weight: 41 }] }];
let notes = [];
let loadingRows = [{ orderNo: 'OP-1', orderRowId: 'drop-1', partyName: '' }];
let customers = [{ _id: '507f1f77bcf86cd799439011', customerName: 'Resolved customer' }];
const model = (rows) => ({ find: () => ({ select: () => ({ lean: async () => rows }) }) });
const run = () => new Function('OrderPanel', 'ConsignmentNote', 'LoadingPanel', 'Customer', 'mongoose', 'companyScopeFilter', 'user', 'pendingLookup', 'NextResponse', `return (async () => { ${code} })();`)(
  model(orders), model(notes), model([{ vehicleArrivalNo: 'LOAD-1', orderRows: loadingRows }]), model(customers),
  { Types: { ObjectId: { isValid: (id) => /^[0-9a-f]{24}$/.test(id) } } }, () => ({}), {}, 'pendingList', { json: (value) => value },
);
assert.equal((await run()).data.rows[0].partyName, 'Resolved customer', 'Resolve the name from Customer when Order has only an ID');
customers = [];
loadingRows[0].partyName = 'Loading party';
assert.equal((await run()).data.rows[0].partyName, 'Loading party');
orders[0].partyName = 'N/A'; orders[0].customerName = ' ';
assert.equal((await run()).data.rows[0].partyName, 'Loading party', 'Placeholder names must not hide a valid fallback');
orders[0].partyName = 'Order party';
assert.equal((await run()).data.rows[0].partyName, 'Order party');
orders[0].plantRows[0].partyName = 'Row party';
assert.equal((await run()).data.rows[0].partyName, 'Row party');
notes = [{ orderRowId: 'drop-1' }];
assert.equal((await run()).data.rows.length, 0);
notes = [];
delete orders[0].partyName; delete orders[0].plantRows[0].partyName;
loadingRows = [{ orderNo: 'OP-1', partyName: 'Party A' }, { orderNo: 'OP-1', partyName: 'Party B' }];
assert.equal((await run()).data.rows[0].partyName, '', 'Do not choose a party from ambiguous legacy Loading rows');
loadingRows = [{ orderNo: 'OP-1', orderRowId: 'drop-1', partyName: 'Visible customer' }];
const rows = (await run()).data.rows;
// Render the real LR table mode with the API result, not just a resolver fixture.
const tableSource = fs.readFileSync('src/components/PendingToCreateTable.jsx', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/^export default function/m, 'function');
const swc = await require('next/dist/build/swc').loadBindings();
const compiled = await swc.transform(tableSource, { filename: 'pending.jsx', jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'classic' } }, target: 'es2022' }, module: { type: 'commonjs' } });
const React = require('react');
let hook = 0;
const Table = new Function('React', 'useState', 'useEffect', 'useRouter', `${compiled.code}\nreturn PendingToCreateTable;`)(React, () => [[rows, false, ''][hook++], () => {}], () => {}, () => ({ push() {} }));
const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Table, { enabled: true, canCreate: true, displayMode: 'lr', createHref: '/admin/Consignment-Note/create' }));
assert(html.includes('Visible customer'));
console.log('PASS: party resolution from row, Order, Customer reference and linked Loading Info; placeholder handling; existing LR exclusion; and actual Party cell rendering.');
