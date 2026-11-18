import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const parser = createRequire(import.meta.url)('@babel/parser');
const read = path => fs.readFileSync(path, 'utf8');
const auth = read('src/lib/auth.js');
const ast = parser.parse(auth, { sourceType: 'module' });
const permissionNode = ast.program.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.id?.name === 'hasPermission').declaration;
const hasPermission = new Function(`return (${auth.slice(permissionNode.start, permissionNode.end)})`)();
const route = read('src/app/api/reports/order-full-report/route.js').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
let user, reads = 0;
const response = { json: (body, options = {}) => ({ body, status: options.status || 200 }) };
const GET = new Function('withBranchAccess', 'NextResponse', 'connectDb', 'getTokenFromHeader', 'verifyJWT', 'hasPermission', 'OrderPanel', `${route}\nreturn GET;`)(
  handler => handler, response, async () => {}, req => req.token,
  async () => { if (!user) throw new Error('Invalid token'); return user; }, hasPermission,
  { find: query => { reads++; assert.equal(query.companyId, 'tenant'); return { sort: () => ({ lean: async () => [] }) }; } }
);
const request = { token: 'test', url: 'https://local/api/reports/order-full-report' };
assert.equal((await GET({ ...request, token: null })).status, 401);
assert.equal((await GET(request)).status, 401);
for (const modules of [{}, { 'order-full-report': { selected: false, permissions: { view: true } } }, { 'order-full-report': { selected: true, permissions: { export: true } } }]) {
  user = { type: 'user', companyId: 'tenant', modules, permissions: ['reports'] };
  assert.equal((await GET(request)).status, 403);
}
assert.equal(reads, 0, 'Unauthorised users must not read report data');
for (const granted of [
  { type: 'user', modules: { 'order-full-report': { selected: true, permissions: { view: true } } } },
  { type: 'user', roles: ['Admin'] },
  { type: 'company' },
]) {
  user = { ...granted, companyId: 'tenant' };
  const result = await GET(request);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
}

// Execute the real sidebar override expression and legacy redirect component.
const layout = read('src/app/(dashboard)/admin/layout.js');
let overrides;
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'VariableDeclarator' && node.id?.name === 'moduleRouteOverrides') overrides = node.init;
  for (const value of Object.values(node)) Array.isArray(value) ? value.forEach(walk) : walk(value);
}
walk(parser.parse(layout, { sourceType: 'module', plugins: ['jsx'] }));
const paths = new Function(`return (${layout.slice(overrides.start, overrides.end)})`)();
assert.equal(paths['order-full-report'], '/admin/reports/order-full-report');
assert(fs.existsSync('src/app/(dashboard)/admin/reports/order-full-report/page.jsx'));
let destination;
const redirectSource = read('src/app/(dashboard)/admin/order-full-report/page.jsx').replace(/^import .*;\r?\n/gm, '').replace('export default ', '');
new Function('redirect', `${redirectSource}\nOrderFullReportRedirect();`)(path => { destination = path; });
assert.equal(destination, paths['order-full-report']);
console.log('PASS report module access, missing/invalid credentials, denied reads, admin access, sidebar path and old-URL redirect.');
