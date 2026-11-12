import assert from 'node:assert/strict';
import { detentionRuleFilter } from '../src/lib/detentionRuleScope.mjs';
import { selectDetentionRule } from '../src/lib/detentionCalculation.js';

const rules = [
  { companyId: 'tenant-1', subCompanyId: 'JGL', active: true, movementType: 'LOCAL', ruleType: 'LOCAL_CALENDAR' },
  { companyId: 'tenant-1', subCompanyId: 'JL', active: true, movementType: 'OUTSTATION', ruleType: 'OUTSTATION_NEXT_DAY_CUTOFF', cutoffTime: '16:00' },
  { companyId: 'tenant-1', active: true, movementType: 'OUTSTATION', ruleType: 'OUTSTATION_NEXT_CALENDAR_DAY' },
  { companyId: 'tenant-2', active: true, movementType: 'LOCAL', ruleType: 'LOCAL_CALENDAR' },
];
for (const operatingCompany of ['JGL', 'JL', 'NK']) {
  const scope = detentionRuleFilter({ companyId: 'tenant-1', activeOperatingCompanyId: operatingCompany }, { active: true });
  const visible = rules.filter(rule => Object.entries(scope).every(([key, value]) => rule[key] === value));
  assert.equal(visible.length, 3, 'Includes legacy and new rules across operating companies, excludes other tenants');
  assert.equal(selectDetentionRule(visible, 'local', '10:00'), rules[0]);
  assert.equal(selectDetentionRule(visible, 'outstation', '15:59'), rules[1]);
  assert.equal(selectDetentionRule(visible, 'outstation', '16:00'), rules[2]);
}
assert.deepEqual(detentionRuleFilter({ companyId: 'tenant-1' }, { _id: 'rule-1', companyId: 'tenant-2' }), { _id: 'rule-1', companyId: 'tenant-1' });
assert.throws(() => detentionRuleFilter({}), /Company is required/);
console.log('PASS: shared operating-company rules, tenant isolation, record scoping, and local/outstation rule selection.');
