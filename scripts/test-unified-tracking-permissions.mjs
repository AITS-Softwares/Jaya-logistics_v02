import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('src/lib/driverMobileStaff.js','utf8').replace(/^import .*;\r?\n/gm,'').replace(/export function/g,'function');
let identity;
const helpers=new Function('NextResponse','verifyToken','hasAnyPermission',source+'; return { requireDriverMobileStaff, requireDriverMobileSettingsStaff, requireDriverAccessMasterStaff };')({json:(...args)=>Response.json(...args)},()=>identity,(user,module,actions)=>user.modules?.[module]?.selected && actions.some(action=>user.modules[module].permissions?.[action]===true));
const user=(module,permissions)=>({type:'user',modules:{[module]:{selected:true,permissions}}});
for(const name of ['requireDriverMobileStaff','requireDriverMobileSettingsStaff']) {
 const check=helpers[name];
 identity=user('Tracking Plan',{view:true});assert(check({},'view').user);assert.equal(check({},'edit').error.status,403);
 identity=user('Tracking Plan',{view:true,edit:true});assert(check({},'view').user);assert(check({},'edit').user);
 identity=user('Driver Mobile Settings',{view:true,edit:true});assert.equal(check({},'view').error.status,403);assert.equal(check({},'edit').error.status,403);
 identity=user('Tracking Plan',{create:true,approve:true});assert.equal(check({},'edit').error.status,403);
 identity={type:'company'};assert(check({},'edit').user);
 identity={type:'user',roles:['Admin']};assert(check({},'edit').user);
 identity=null;assert.equal(check({},'view').error.status,401);
}
identity=user('Tracking Plan',{view:true});assert(helpers.requireDriverAccessMasterStaff({}).user);
console.log('PASS: unified Tracking Plan authorization, view-only denial of edits, admin access, retired permission denial and unauthenticated denial.');
