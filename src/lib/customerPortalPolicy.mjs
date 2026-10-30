export const PORTAL_AUDIENCE = 'jaya-customer-portal';
export const PORTAL_ISSUER = 'jaya-portal';
export const normalizePortalEmail = value => String(value || '').trim().toLowerCase();
export const validPortalEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const validPortalPassword = value => typeof value === 'string' && value.length >= 8 && new TextEncoder().encode(value).length <= 72;

export function portalCustomerSession(user, customer) {
  return {
    id: String(user._id), type: 'customer', name: user.name, email: user.email,
    customerId: String(customer._id), customerName: customer.customerName,
    companyId: String(user.companyId),
  };
}

const id = value => String(value || '');

// No name/number fallback: an ambiguous loading link must never reveal another dispatch.
export function loadingMatchesDrop(loading, order, row) {
  return id(loading.companyId) === id(order.companyId) &&
    id(loading.subCompanyId) === id(order.subCompanyId) &&
    !loading.isDeleted && !loading.isDraft && ['Approved', 'Completed'].includes(loading.panelStatus) &&
    (loading.orderRows || []).some(link =>
      id(link.orderPanelId) === id(order._id) && id(link.orderRowId) === id(row._id));
}

// Explicit response mapping; adding internal schema fields never exposes them automatically.
export function customerOrderView(order, loadings = [], negotiations = []) {
  const rows = (order.plantRows || []).map(row => ({
    id: id(row._id), plant: row.plantName || '', from: row.fromName || '', to: row.toName || '',
    weight: Number(row.weight) || 0, plantCode: row.plantCodeValue || '', orderType: row.orderType || '',
    destination: { taluka: row.talukaName || '', district: row.districtName || '', state: row.stateName || '', country: row.countryName || '', pinCode: row.pinCode || '' },
    status: order.panelStatus === 'Cancelled' ? 'Cancelled' : (['Open', 'Hold', 'Cancelled'].includes(row.status) ? row.status : 'Open'),
    vehicles: loadings.filter(loading => loadingMatchesDrop(loading, order, row))
      .filter(loading => loading.vehicleInfo?.vehicleNo)
      .map(loading => ({ dispatchId: id(loading._id), vehicleNo: loading.vehicleInfo.vehicleNo, trackingAvailable: false })),
  }));
  for (const row of rows) {
    if (row.vehicles.length) continue;
    const assigned = negotiations.filter(vnn => id(vnn.companyId) === id(order.companyId) &&
      id(vnn.subCompanyId) === id(order.subCompanyId) && vnn.approval?.vehicleNo &&
      (vnn.orders || []).some(link => id(link.orderPanelId) === id(order._id) && id(link.orderRowId) === row.id));
    row.vehicles = [...new Map(assigned.map(vnn => [vnn.approval.vehicleNo, {
      dispatchId: null, assignmentId: id(vnn._id), vehicleNo: vnn.approval.vehicleNo,
      source: 'VNN', trackingAvailable: false,
    }])).values()];
  }
  return {
    id: id(order._id), orderNo: order.orderPanelNo || '', date: order.date,
    branch: order.branchName || '', delivery: order.delivery || 'Normal', approvedAt: order.approvedAt || null,
    operatingCompany: order.subCompanyName || order.subCompanyCode || '',
    status: order.panelStatus === 'Completed' ? 'Completed' : order.panelStatus === 'Cancelled' ? 'Cancelled' : 'Open',
    totalWeight: rows.reduce((sum, row) => sum + row.weight, 0), rows,
  };
}

export function customerOrderFilter({ companyId, customerId, operatingCompanyIds }) {
  return {
    companyId, customerId, subCompanyId: { $in: operatingCompanyIds },
    isDeleted: { $ne: true }, isDraft: { $ne: true },
    panelStatus: { $in: ['Approved', 'Completed', 'Cancelled'] },
    // Do not expose changes still being reviewed, or an unapproved customer reassignment.
    reapprovalState: { $in: [null, 'none'] },
  };
}
