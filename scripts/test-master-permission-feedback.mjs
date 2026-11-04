import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const context=vm.createContext({URL});
const registry=new vm.SourceTextModule(fs.readFileSync('src/lib/masterPermissionRegistry.js','utf8'),{context});
await registry.link(()=>{throw new Error('Unexpected dependency');});
const policy=new vm.SourceTextModule(fs.readFileSync('src/lib/masterPermissionFeedback.mjs','utf8'),{context});
await policy.link(()=>registry);await policy.evaluate();
const feedback=policy.namespace.masterPermissionFeedback;
const base={origin:'https://erp.test',status:403};
let result=feedback({...base,url:'/api/suppliers',method:'POST',data:{message:'You do not have permission to create Suppliers.'}});
assert.equal(result.action,'create');assert.match(result.message,/create Suppliers/);assert.match(result.help,/administrator/);
result=feedback({...base,url:'/api/rate-master/123/approve',method:'POST'});assert.equal(result.action,'approve');assert.match(result.message,/not authorized/);
result=feedback({...base,url:'/api/suppliers/123/reject',method:'POST',data:{message:'You cannot approve or reject your own submission.'}});
assert.equal(result.title,'Another approver is required');assert.match(result.help,/another authorized approver/);
result=feedback({...base,url:'/api/locations',method:'PUT',data:{error:'Editing locations is not allowed.'}});assert.equal(result.action,'edit');assert.equal(result.message,'Editing locations is not allowed.');
assert.equal(feedback({...base,url:'/api/loading-panel',method:'POST'}),null);
assert.equal(feedback({...base,url:'https://other.test/api/suppliers',method:'POST'}),null);
assert.equal(feedback({...base,status:500,url:'/api/suppliers'}),null);
assert.equal(feedback({...base,status:200,url:'/api/suppliers'}),null);
assert.equal(feedback({...base,url:'/api/suppliers-extra'}),null);
console.log('PASS: clear master permission messages, action/resource mapping, server reasons, self-review guidance and unrelated-request isolation.');

let staff;
const auth = new vm.SyntheticModule(['getTokenFromHeader', 'verifyJWT'], function () {
  this.setExport('getTokenFromHeader', req => req.token);
  this.setExport('verifyJWT', token => token === 'staff-token' ? { id: 'staff', companyId: 'company' } : null);
}, { context });
const db = new vm.SyntheticModule(['default'], function () {
  this.setExport('default', async () => {});
}, { context });
const companyUser = new vm.SyntheticModule(['default'], function () {
  this.setExport('default', { findById: () => ({ select: () => ({ lean: async () => staff }) }) });
}, { context });
const permission = new vm.SourceTextModule(fs.readFileSync('src/lib/masterDataPermission.js', 'utf8'), { context });
const imports = {
  '@/lib/auth': auth,
  '@/lib/db': db,
  '@/models/CompanyUser': companyUser,
  '@/lib/masterPermissionRegistry': registry,
};
await permission.link(name => imports[name]);
await permission.evaluate();
const validate = permission.namespace.validateMasterDataRequest;
const request = { token: 'staff-token' };
const useModule = (name, action = 'view') => {
  staff = { companyId: 'company', modules: { [name]: { selected: true, permissions: { [action]: true } } } };
};
const options = { allowLookup: true, optionsOnly: true };
for (const [form, resource] of [
  ['Vehicle Negotiation Placement', 'Purchase Types'],
  ['Vehicle Negotiation', 'Customers'],
  ['Items', 'Customers'],
  ['Rate Master', 'Customers'],
  ['Customers', 'General Ledger'],
  ['Suppliers', 'General Ledger'],
  ['Proof Of Delivery', 'Suppliers'],
]) {
  useModule(form, 'edit');
  assert.equal((await validate(request, 'view', resource, options)).access, 'lookup', form + ' / ' + resource);
  assert.equal((await validate(request, 'view', resource, { allowLookup: true })).status, 403);
  for (const action of ['create', 'edit', 'delete', 'approve']) {
    assert.equal((await validate(request, action, resource, options)).status, 403);
  }
}
for (const [form, resource] of [
  ['Vehicle Negotiation', 'Purchase Types'],
  ['Vehicle Negotiation', 'Suppliers'],
  ['Vehicle Negotiation', 'Plants'],
  ['Purchase Panel', 'Plants'],
  ['Customers', 'Groups'],
  ['Suppliers', 'Groups'],
  ['Items', 'Item Groups'],
  ['Rate Master', 'Branches'],
  ['Rate Master', 'Locations'],
  ['Users', 'Branches'],
  ['Users', 'Sub Companies'],
]) {
  useModule(form);
  assert.equal((await validate(request, 'view', resource, { allowLookup: true })).access, 'lookup', form + ' / ' + resource);
  assert.equal((await validate(request, 'view', resource)).status, 403);
}
useModule('Items');
assert.equal((await validate(request, 'view', 'General Ledger', options)).status, 403);
useModule('Vehicle Negotiation', 'delete');
assert.equal((await validate(request, 'view', 'Purchase Types', options)).status, 403);
useModule('Purchase Types');
assert.equal((await validate(request, 'view', 'Purchase Types')).access, 'master');
assert.equal((await validate({}, 'view', 'Purchase Types', options)).status, 401);
staff.isActive = false;
assert.equal((await validate(request, 'view', 'Purchase Types', options)).status, 401);
console.log('PASS: embedded master lookups, option-only scope, and denial of unrelated reads and master writes.');
