import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { hasLoadingCorrectionContext, needsLoadingVnnComparison } from '../src/lib/loadingVnnSync.mjs';
import { loadingStageLabel, newLoadingWorkflow } from '../src/lib/loadingApprovalWorkflow.mjs';
const vnn = { _id: 'vnn', vnnNo: 'VNN-1', panelStatus: 'Approved', approvedRevision: 2, orders: [{}] };
const fresh = { _id: 'loading', vehicleNegotiationNo: 'VNN-1', orderRows: [{ orderNo: 'ORDER-1' }], sourceDependencies: [{ panel: 'vnn', recordId: 'vnn', revision: 2 }], approvedRevision: 0 };
assert.equal(needsLoadingVnnComparison(fresh, vnn), false);
assert.equal(needsLoadingVnnComparison({ ...fresh, sourceDependencies: [] }, vnn), false);
assert.equal(needsLoadingVnnComparison(fresh, { ...vnn, approvedRevision: 3 }), true);
assert.equal(needsLoadingVnnComparison({ ...fresh, upstreamPending: [{ panel: 'order' }] }, vnn), true);
assert.equal(loadingStageLabel({ loadingWorkflow: newLoadingWorkflow(true) }), 'Part 1 pending approval');
assert.equal(loadingStageLabel({ loadingWorkflow: { ...newLoadingWorkflow(), currentPart: 2, part1Status: 'Approved', part2Status: 'Draft' } }), 'Part 2 open for editing');
assert.equal(loadingStageLabel({ loadingWorkflow: { version: 2, currentPart: 2, part1Status: 'Approved', part2Status: 'Submitted' } }), 'Part 2 pending approval');
const parser = createRequire(import.meta.url)('next/dist/compiled/babel/parser');
const source = fs.readFileSync(new URL('../src/lib/reapprovalService.js', import.meta.url), 'utf8');
const ast = parser.parse(source, { sourceType: 'module' });
const node = ast.program.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.id?.name === 'findLatestApprovedVnnForLoading').declaration;
let candidates = [vnn], comparisons = 0;
const deps = {
  hasLoadingCorrectionContext, needsLoadingVnnComparison,
  VehicleNegotiation: { find: () => { const query = { select: () => query, setOptions: () => query, lean: async () => candidates }; return query; } },
  loadingOrderRowMatches: () => true, toPlain: value => value,
  applyMirroredFields: (type, from, to) => { comparisons++; to.updatedFromVnn = true; return {}; },
  mirroredProjection: (type, record) => ({ updated: record.updatedFromVnn || false }),
  normalizedObject: JSON.stringify, findDetachedLoadingOrderMarkers: async () => [],
};
const findLatest = new Function(...Object.keys(deps), source.slice(node.start, node.end) + '\nreturn findLatestApprovedVnnForLoading;')(...Object.values(deps));
assert.equal((await findLatest(fresh, 'company')).required, false);
assert.equal(comparisons, 0, 'Initial copied-data differences must not trigger a comparison or sync warning');
candidates = [{ ...vnn, approvedRevision: 3 }];
assert.equal((await findLatest(fresh, 'company')).required, true, 'A newer approved upstream revision must still be detected');
candidates = [{ ...vnn, _id: 'other', vnnNo: 'OTHER-VNN' }];
assert.equal((await findLatest(fresh, 'company')).required, false, 'A matching unrelated VNN must not replace the explicit source');
console.log('PASS: first-time Loading Info shows its stage and no false VNN reapproval; actual upstream revisions still require review.');
