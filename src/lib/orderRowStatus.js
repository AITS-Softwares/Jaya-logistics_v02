import OrderPanel from '@/app/api/order-panel/OrderPanel';
import { companyScopeFilter } from '@/lib/companyScope';

const text = (value) => String(value ?? '').trim().toLowerCase();

/** Reject stale downstream submissions that reference a held/cancelled lane. */
export async function validateOpenOrderRows(user, rows = []) {
  const orderNos = [...new Set(rows.map((row) => text(row.orderNo || row.orderPanelNo)).filter(Boolean))];
  if (!orderNos.length) return null;
  const panels = await OrderPanel.find(companyScopeFilter(user, { orderPanelNo: { $in: orderNos } }))
    .select('orderPanelNo plantRows')
    .lean();
  const panelByNo = new Map(panels.map((panel) => [text(panel.orderPanelNo), panel]));
  for (const source of rows) {
    const panel = panelByNo.get(text(source.orderNo || source.orderPanelNo));
    if (!panel) continue;
    const candidates = panel.plantRows || [];
    const match = source.orderRowId || source.sourceRowId
      ? candidates.find((row) => String(row._id) === String(source.orderRowId || source.sourceRowId))
      : candidates.find((row) => {
        const plantMatches = text(source.plantCodeValue || source.plantCode || source.plantName)
          === text(row.plantCodeValue || row.plantCode || row.plantName);
        const fromMatches = !source.from && !source.fromName || [source.from, source.fromName].some((v) => text(v) === text(row.from || row.fromName));
        const toMatches = !source.to && !source.toName || [source.to, source.toName].some((v) => text(v) === text(row.to || row.toName));
        return plantMatches && fromMatches && toMatches;
      });
    if (match && ((match.status || 'Open') !== 'Open' || match.statusRequest?.action)) {
      const state = match.statusRequest?.action ? `${match.status} with a ${match.statusRequest.action.toLowerCase()} request pending approval` : match.status;
      return `Order ${panel.orderPanelNo}, row ${match.plantName || match._id} is ${state}. Only open rows without pending status requests can be used.`;
    }
  }
  return null;
}

/** Filter saved downstream references to currently open source lanes. */
export async function filterOpenOrderRows(user, rows = []) {
  const orderNos = [...new Set(rows.map((row) => text(row.orderNo || row.orderPanelNo)).filter(Boolean))];
  if (!orderNos.length) return rows;
  const panels = await OrderPanel.find(companyScopeFilter(user, { orderPanelNo: { $in: orderNos } }))
    .select('orderPanelNo plantRows')
    .lean();
  const panelByNo = new Map(panels.map((panel) => [text(panel.orderPanelNo), panel]));
  return rows.filter((source) => {
    const panel = panelByNo.get(text(source.orderNo || source.orderPanelNo));
    if (!panel) return true;
    const candidates = panel.plantRows || [];
    const match = source.orderRowId || source.sourceRowId
      ? candidates.find((row) => String(row._id) === String(source.orderRowId || source.sourceRowId))
      : candidates.find((row) => {
        const plantMatches = text(source.plantCodeValue || source.plantCode || source.plantName)
          === text(row.plantCodeValue || row.plantCode || row.plantName);
        const fromMatches = !source.from && !source.fromName || [source.from, source.fromName].some((v) => text(v) === text(row.from || row.fromName));
        const toMatches = !source.to && !source.toName || [source.to, source.toName].some((v) => text(v) === text(row.to || row.toName));
        return plantMatches && fromMatches && toMatches;
      });
    return !!match && (match.status || 'Open') === 'Open' && !match.statusRequest?.action;
  });
}
