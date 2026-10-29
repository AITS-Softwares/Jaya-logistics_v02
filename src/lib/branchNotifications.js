import { branchContext } from './branchContext';
import { branchModels, canAccessBranches, key } from './branchOwnership.mjs';

export async function notificationBranchSource({ reference, sourceModel, sourceRecordId, message = '' }) {
  const scope = branchContext.getStore();
  if (!scope) return null;
  const graph = await scope.load();
  for (const [model, spec] of Object.entries(branchModels)) {
    if (sourceModel && sourceModel !== model) continue;
    let doc = graph.lookup(model, sourceRecordId || reference);
    if (!doc && !sourceRecordId && !reference && spec.number) {
      doc = (graph.rows.get(model) || []).find(row => {
        const no = key(row[spec.number]);
        return no && message.split(/\s+/).some(token => token.replace(/[.,:;]$/, '') === no);
      });
    }
    if (doc) return { sourceModel: model, sourceRecordId: key(doc._id), subCompanyId: key(doc.subCompanyId), ownership: graph.resolve(model, doc) };
  }
  return null;
}

export async function visibleBranchNotifications(notifications, { overview = false } = {}) {
  const scope = branchContext.getStore();
  if (!scope) return notifications;
  const visible = [];
  for (const item of notifications) {
    const operatingId = key(scope.user.activeOperatingCompanyId);
    const consolidated = scope.user.type === 'company' && scope.user.isGroupAdmin === true && !operatingId;
    if (item.subCompanyId && !consolidated && key(item.subCompanyId) !== operatingId) continue;
    // Explicit metadata avoids loading the ownership graph for recent events.
    if (item.subCompanyId && item.branchIds?.length) {
      if (canAccessBranches(scope.access, item.branchIds.map(key))) visible.push(item);
      continue;
    }
    const source = await notificationBranchSource(item);
    if (source) {
      if (source.subCompanyId && !consolidated && source.subCompanyId !== operatingId) continue;
      if (canAccessBranches(scope.access, source.ownership)) visible.push(item);
      continue;
    }
    // Unscoped personal notices (e.g. device tests) are not company activity.
    // Unresolvable legacy alerts cannot bypass selected-branch restrictions.
    if (scope.access.accessAllBranches && (consolidated || item.subCompanyId || (!overview && !item.sourceModel && !/^(order-|pricing-|pending-|approval-|workflow-)/.test(item.type || '')))) visible.push(item);
  }
  return visible;
}
