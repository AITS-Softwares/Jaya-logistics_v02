import assert from 'node:assert/strict';
import { normaliseDetentionRuleType } from '../src/lib/unloadingDetention.mjs';
import { selectDetentionRule } from '../src/lib/detentionCalculation.js';

const unloading = normaliseDetentionRuleType({ detentionType: 'UNLOADING', movementType: 'LOCAL', ruleType: 'UNLOADING_BEFORE_CUTOFF', cutoffTime: '16:00', graceDays: 5 });
assert.equal(unloading.movementType, 'ALL');
assert.equal(unloading.ruleType, 'UNLOADING_BEFORE_CUTOFF');
assert.equal(unloading.graceDays, 1);
assert.equal(unloading.additionalDayMethod, 'CALENDAR_DAY');
const legacy = { active: true, movementType: 'LOCAL', ruleType: 'LOCAL_CALENDAR' };
assert.equal(normaliseDetentionRuleType(legacy).detentionType, 'LOADING');
assert.equal(selectDetentionRule([{ ...unloading, active: true }, legacy], 'local', '10:00'), legacy);
assert.equal(selectDetentionRule([{ ...unloading, active: true }], 'local', '17:00'), undefined);
assert.throws(() => normaliseDetentionRuleType({ detentionType: 'UNLOADING', cutoffTime: '25:00' }), /valid cutoff/);
assert.throws(() => normaliseDetentionRuleType({ detentionType: 'LOADING', movementType: 'ALL', ruleType: 'UNLOADING_CUTOFF' }), /valid loading/);
console.log('PASS: unloading rule setup, cutoff validation, legacy loading defaults, and separation from loading calculations.');

const after = normaliseDetentionRuleType({ detentionType: 'UNLOADING', ruleType: 'UNLOADING_AT_OR_AFTER_CUTOFF', cutoffTime: '16:00' });
assert.equal(after.ruleType, 'UNLOADING_AT_OR_AFTER_CUTOFF');
assert.equal(after.graceDays, 0);
assert.equal(normaliseDetentionRuleType({ detentionType: 'UNLOADING', ruleType: 'UNLOADING_CUTOFF' }).ruleType, 'UNLOADING_CUTOFF');
assert.throws(() => normaliseDetentionRuleType({ detentionType: 'UNLOADING', ruleType: 'LOCAL_CALENDAR' }), /valid unloading/);
