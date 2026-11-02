import { spawnSync } from 'node:child_process';
const suites = [
  'test-loading-stale-vnn-recovery.mjs',
  'test-panel-user-workflows.mjs',
  'test-cancellation-user-workflows.mjs',
  'test-reapproval-multi-user-chain.mjs',
  'test-workflow-notifications.mjs',
  'test-order-cancellation-flow.mjs',
  'test-automatic-cancellation-reconciliation.mjs',
  'test-cancellation-write-guards.mjs',
  'test-correction-request-flow.mjs',
  'test-cancellation-charge-review.mjs',
  'test-lr-pricing-eligibility.mjs',
  'test-loading-approval-stages.mjs',
  'test-loading-initial-approval-status.mjs',
  'test-reapproval-unlock-permissions.mjs',
  'test-reapproval-queue-permissions.mjs',
  'test-reapproval-presentation.mjs',
  'test-reapproval-pack-sync.mjs',
  'test-reapproval-location-remark.mjs',
  'test-reapproval-change-summary.mjs',
  'test-lr-list-reapproval.mjs',
  'test-notification-center.mjs',
  'test-admin-notification-activity.mjs',
];
for (const suite of suites) {
  const result = spawnSync(process.execPath, [`scripts/${suite}`], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`PASS: ${suites.length} offline workflow suites. No database records changed.`);
