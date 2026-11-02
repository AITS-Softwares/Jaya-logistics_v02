import PricingPanel from '@/app/api/pricing-panel/PricingPanel';
import { companyScopeFilter } from '@/lib/companyScope';
import { panelApprovalStatus } from '@/lib/reapprovalPresentation.mjs';

export const pricingReadyForLr = panel => !panel.isDraft && !['cancelled', 'review'].includes(panel.cancellation?.state) &&
  (!panel.reapprovalState || panel.reapprovalState === 'none') && !panel.upstreamPending?.length &&
  ['Approved', 'Completed'].includes(panelApprovalStatus('pricing', panel));

export async function approvedPricingForLr(user, orderNo, orderRowId) {
  const panels = await PricingPanel.find(companyScopeFilter(user, { 'orders.orderNo': orderNo })).lean();
  // A linked unapproved pricing revision must never be bypassed by another approved panel.
  const linked = panels.filter(panel => (panel.orders || []).some(row => row.orderNo === orderNo &&
    (!orderRowId || !row.orderRowId || String(row.orderRowId) === String(orderRowId))));
  return linked.length > 0 && linked.every(pricingReadyForLr);
}

export async function filterLrEligibleLoading(user, loadingInfos) {
  // LR creation depends on Loading readiness. Pricing approval gates document
  // release in Loading Info, not creation or the LR order dropdown.
  return loadingInfos.filter(info => !['cancelled', 'review'].includes(info.cancellation?.state) && !info.upstreamPending?.length &&
    (!info.reapprovalState || info.reapprovalState === 'none') && !info.isDraft &&
    ['Approved', 'Completed'].includes(info.panelStatus) &&
    (info.loadingWorkflow?.version !== 2 || info.loadingWorkflow.part2Status === 'Approved'))
    .filter(info => info.orderRows?.length > 0);
}

export async function loadingPricingApproval(user, loading) {
  const rows = loading.orderRows || [];
  const orderNos = [...new Set(rows.map(row => row.orderNo).filter(Boolean))];
  const panels = orderNos.length ? await PricingPanel.find(companyScopeFilter(user, { 'orders.orderNo': { $in: orderNos } })).lean() : [];
  const pending = rows.filter(row => {
    if (!row.orderNo) return true;
    const linked = panels.filter(panel => (panel.orders || []).some(source => source.orderNo === row.orderNo &&
      (!row.orderRowId || !source.orderRowId || String(source.orderRowId) === String(row.orderRowId))));
    return !linked.length || !linked.every(pricingReadyForLr);
  });
  return { approved: rows.length > 0 && !pending.length, pendingOrders: [...new Set(pending.map(row => row.orderNo || 'Unknown order'))] };
}
