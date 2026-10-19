import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDb from '@/lib/db';
import { withAuth, hasPermission } from '@/lib/auth';
import { companyScopeFilter } from '@/lib/companyScope';
import OrderPanel from '../../OrderPanel';
import PurchasePanel from '@/app/api/purchase-panel/PurchasePanel';
import AdvancePayment from '@/app/api/Advance-Payment/AdvancePayment';
import ConsignmentNote from '@/app/api/consignment-note/ConsignmentNote';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import LoadingPanel from '@/app/api/loading-panel/LoadingPanel';
import CompanyUser from '@/models/CompanyUser';
import Notification from '@/models/project/NotificationModel';

const idOf = (value) => String(value?._id || value || '');

export const POST = withAuth(async (req, { params }, user) => {
  await connectDb();
  if (!['create', 'edit', 'approve'].some((action) => hasPermission(user, 'Order Panel', action))) {
    return NextResponse.json({ success: false, message: 'Order create, edit, or approve permission is required.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, message: 'Invalid order id.' }, { status: 400 });
    const order = await OrderPanel.findOne(companyScopeFilter(user, { _id: id }));
    if (!order) return NextResponse.json({ success: false, message: 'Order not found.' }, { status: 404 });

    const body = await req.json();
    let action = String(body.action || '').trim();
    let reason = String(body.reason || '').trim();
    const statusDecision = body.statusDecision;
    let approvingStatusRequest = false;
    let approvalRows = null;
    if (statusDecision) {
      if (!hasPermission(user, 'Order Panel', 'approve')) {
        return NextResponse.json({ success: false, message: 'Order approve permission is required to review status requests.' }, { status: 403 });
      }
      if (!['approve', 'reject'].includes(statusDecision)) {
        return NextResponse.json({ success: false, message: 'Status decision must be approve or reject.' }, { status: 400 });
      }
      const requestRows = (order.plantRows || []).filter((row) => row.statusRequest?.action);
      if (!requestRows.length) {
        return NextResponse.json({ success: false, message: 'This order has no pending status request.' }, { status: 409 });
      }
      if (statusDecision === 'reject') {
        if (!reason) return NextResponse.json({ success: false, message: 'A rejection reason is required.' }, { status: 400 });
        const now = new Date();
        for (const row of requestRows) {
          const requestedAction = row.statusRequest.action;
          const current = row.status || 'Open';
          row.statusHistory.push({ action: `${requestedAction} Request Rejected`, from: current, to: current, reason, by: user.id, at: now });
          row.statusRequest = undefined;
        }
        await order.save();
        return NextResponse.json({ success: true, message: 'Status request rejected.', data: order });
      }
      const requestedActions = [...new Set(requestRows.map((row) => row.statusRequest.action))];
      if (requestedActions.length !== 1) return NextResponse.json({ success: false, message: 'Review requests for one action at a time.' }, { status: 409 });
      action = requestedActions[0];
      reason = requestRows[0].statusRequest.reason;
      body.cancellationCharge = requestRows[0].statusRequest.cancellationCharge;
      approvingStatusRequest = true;
      approvalRows = requestRows;
    }
    if (!['Hold', 'Resume', 'Cancel'].includes(action)) return NextResponse.json({ success: false, message: 'Action must be Hold, Resume, or Cancel.' }, { status: 400 });
    if (!reason) return NextResponse.json({ success: false, message: 'A reason is required.' }, { status: 400 });
    const allowedFrom = { Hold: ['Open'], Resume: ['Hold'], Cancel: ['Open', 'Hold'] };
    const requested = approvalRows || order.plantRows.filter((row) => allowedFrom[action]?.includes(row.status || 'Open'));
    if (!requested.length) {
      return NextResponse.json({ success: false, message: `No order rows can be ${action === 'Cancel' ? 'cancelled' : action === 'Hold' ? 'held' : 'resumed'}.` }, { status: 409 });
    }

    const transitions = allowedFrom;
    const invalid = requested.filter((row) => !transitions[action].includes(row.status || 'Open'));
    if (invalid.length) return NextResponse.json({ success: false, message: `${action} is not allowed for row(s): ${invalid.map((r) => r.plantName || r._id).join(', ')}.` }, { status: 409 });
    if (!approvingStatusRequest && requested.some((row) => row.statusRequest?.action)) {
      return NextResponse.json({ success: false, message: 'A status request is already pending approval for one or more selected rows.' }, { status: 409 });
    }

    const orderNo = order.orderPanelNo;
    const targetIds = new Set(requested.map(idOf));
    const requestedRowIds = [...targetIds];
    const [purchases, lrs, negotiations, loadingPanels] = await Promise.all([
      PurchasePanel.find(companyScopeFilter(user, { 'orderRows.orderNo': orderNo })),
      ConsignmentNote.find(companyScopeFilter(user, { 'header.orderNo': orderNo })),
      VehicleNegotiation.find(companyScopeFilter(user, { $or: [
        { 'orders.orderNo': orderNo }, { 'orders.orderPanelId': String(order._id) }, { 'orders.orderRowId': { $in: requestedRowIds } }
      ] })),
      LoadingPanel.find(companyScopeFilter(user, { $or: [
        { 'orderRows.orderNo': orderNo }, { 'orderRows.orderPanelId': String(order._id) }, { 'orderRows.orderRowId': { $in: requestedRowIds } }
      ] })).select('vehicleArrivalNo panelStatus orderRows').lean()
    ]);
    const relevantPurchases = purchases.map((purchase) => ({
      purchase,
      affectedRows: (purchase.orderRows || []).filter((r) => r.orderNo === orderNo && targetIds.has(String(r.orderRowId || r.sourceRowId || r._id)))
    })).filter((item) => item.affectedRows.length || (purchaseRowsMatchFallback(item.purchase.orderRows, orderNo, requested)));

    const paidAdvances = await AdvancePayment.find(companyScopeFilter(user, {
      purchaseNo: { $in: relevantPurchases.map((item) => item.purchase.purchaseNo) },
      $or: [{ status: { $in: ['Paid', 'Completed'] } }, { 'paymentDetails.paymentStatus': { $in: ['Paid', 'Completed'] } }]
    })).select('paymentNo purchaseNo status paymentDetails.paymentStatus').lean();
    const paidByPurchase = new Map(paidAdvances.map((p) => [p.purchaseNo, p]));
    const relevantLrs = lrs.filter((lr) => lr.orderRowId
      ? targetIds.has(String(lr.orderRowId))
      : requested.some((row) => {
        const destinationMatches = !lr.header?.to || same(lr.header.to, row.toName || row.to);
        const plantMatches = !lr.header?.plantCode || same(lr.header.plantCode, row.plantCodeValue || row.plantName || row.plantCode);
        return destinationMatches && plantMatches;
      }));
    const lockedLrs = relevantLrs.filter((lr) => ['Approved', 'Completed'].includes(lr.header?.status) && lr.invoice?.file?.filePath);
    const blockers = relevantPurchases.filter(({ purchase }) => paidByPurchase.has(purchase.purchaseNo)).map(({ purchase }) => ({ type: 'purchase', record: purchase.purchaseNo, reason: `Advance payment ${paidByPurchase.get(purchase.purchaseNo).paymentNo} is paid.` }));
    const affectedLoadingPanels = loadingPanels.filter((panel) => (panel.orderRows || []).some((row) =>
      row.orderNo === orderNo || String(row.orderPanelId || '') === String(order._id) || targetIds.has(String(row.orderRowId || ''))
    ));
    const approvedLoadingInfoNos = affectedLoadingPanels
      .filter((panel) => ['Approved', 'Completed'].includes(panel.panelStatus))
      .map((panel) => panel.vehicleArrivalNo)
      .filter(Boolean);
    const lrsForApprovedLoadingInfo = approvedLoadingInfoNos.length
      ? await ConsignmentNote.find(companyScopeFilter(user, { loadingInfoNo: { $in: approvedLoadingInfoNos } }))
        .select('lrNo loadingInfoNo header.status invoice.file.filePath')
        .lean()
      : [];
    const finalizedLoadingInfo = affectedLoadingPanels.filter((panel) => {
      if (!['Approved', 'Completed'].includes(panel.panelStatus) || !panel.vehicleArrivalNo) return false;
      const linkedLrs = lrsForApprovedLoadingInfo.filter((lr) => lr.loadingInfoNo === panel.vehicleArrivalNo);
      return linkedLrs.length > 0 && linkedLrs.every((lr) =>
        ['Approved', 'Completed'].includes(lr.header?.status) && !!lr.invoice?.file?.filePath
      );
    });
    for (const panel of finalizedLoadingInfo) {
      blockers.push({
        type: 'loading-info-finalized',
        record: panel.vehicleArrivalNo,
        reason: `Loading Info ${panel.vehicleArrivalNo} is approved and all linked LRs are approved with invoices uploaded. Hold and Cancel are no longer available for this order.`
      });
    }
    const sourceRowForVnnOrder = (linkedRow) => {
      const byId = order.plantRows.find((row) => idOf(row) === String(linkedRow.orderRowId || ''));
      if (byId) return byId;
      if (linkedRow.orderNo && linkedRow.orderNo !== orderNo) return null;
      const candidates = order.plantRows.filter((row) =>
        (!linkedRow.plantName && !linkedRow.plantCodeValue || same(row.plantName || row.plantCodeValue || row.plantCode, linkedRow.plantName || linkedRow.plantCodeValue)) &&
        (!linkedRow.toName && !linkedRow.to || same(row.toName || row.to, linkedRow.toName || linkedRow.to))
      );
      return candidates.length === 1 ? candidates[0] : null;
    };
    const belongsToOrder = (linkedRow) => String(linkedRow.orderPanelId || '') === String(order._id) || linkedRow.orderNo === orderNo;
    // A Vehicle Negotiation can carry several order rows. Do not cancel or
    // release its vehicle unless every linked row is included in this cancel.
    const negotiationsToCancel = negotiations.filter((negotiation) => {
      const linkedRows = negotiation.orders || [];
      return linkedRows.length > 0 && linkedRows.every((linkedRow) => {
        const sourceRow = sourceRowForVnnOrder(linkedRow);
        return belongsToOrder(linkedRow) && sourceRow &&
          (targetIds.has(idOf(sourceRow)) || sourceRow.status === 'Cancelled');
      });
    });
    const negotiationsNeedingReplacement = ['Cancel', 'Hold'].includes(action) ? negotiations.filter((negotiation) =>
      !negotiationsToCancel.includes(negotiation) && (negotiation.orders || []).some((linkedRow) =>
        belongsToOrder(linkedRow) && targetIds.has(idOf(sourceRowForVnnOrder(linkedRow)))
      )
    ) : [];

    const impact = {
      orderNo,
      rows: requested.map((row) => ({ id: idOf(row), plant: row.plantName, from: row.status || 'Open', to: action === 'Cancel' ? 'Cancelled' : action === 'Hold' ? 'Hold' : 'Open' })),
      purchases: relevantPurchases.map(({ purchase }) => ({ purchaseNo: purchase.purchaseNo, advancePaid: paidByPurchase.has(purchase.purchaseNo) })),
      paidAdvances: paidAdvances.map((payment) => ({ paymentNo: payment.paymentNo, purchaseNo: payment.purchaseNo })),
      lrs: relevantLrs.map((lr) => ({ lrNo: lr.lrNo, status: lr.header?.status, invoiceUploaded: !!lr.invoice?.file?.filePath, locked: lockedLrs.includes(lr) })),
      loadingPanels: affectedLoadingPanels.map((panel) => ({ vehicleArrivalNo: panel.vehicleArrivalNo, status: panel.panelStatus || 'Linked' })),
      vehicleNegotiations: negotiations.filter((n) => (n.orders || []).some((linkedRow) => belongsToOrder(linkedRow) && targetIds.has(idOf(sourceRowForVnnOrder(linkedRow))))).map((n) => ({ vnnNo: n.vnnNo, effect: action === 'Cancel' && negotiationsToCancel.includes(n) ? 'will cancel and release vehicle' : ['Cancel', 'Hold'].includes(action) ? 'will remain active; replacement order needed' : 'linked; unchanged' })),
      blockers,
      willCancelNegotiations: action === 'Cancel' ? negotiationsToCancel.map((n) => n.vnnNo) : [],
      willNeedReplacement: negotiationsNeedingReplacement.map((n) => n.vnnNo),
      willCloseLrs: action === 'Cancel' ? relevantLrs.filter((lr) => !lockedLrs.includes(lr)).map((lr) => lr.lrNo) : []
    };
    const requiresApproval = ['Hold', 'Cancel'].includes(action) && !hasPermission(user, 'Order Panel', 'approve');
    if (body.dryRun === true) return NextResponse.json({ success: true, impact, canConfirm: blockers.length === 0, requiresApproval });
    if (action === 'Hold' && requested.some((row) => row.status !== 'Open')) return NextResponse.json({ success: false, message: 'Only open rows can be held.' }, { status: 409 });
    if ((action === 'Cancel' || action === 'Hold') && blockers.length) return NextResponse.json({ success: false, message: blockers.map((b) => b.reason).join(' '), blockers }, { status: 409 });
    let cancellationCharge = null;
    if (action === 'Cancel' && body.cancellationCharge !== undefined) {
      const charge = Number(body.cancellationCharge.amount);
      const mode = body.cancellationCharge.mode;
      if (!Number.isFinite(charge) || charge < 0 || !['flat', 'per MT'].includes(mode)) {
        return NextResponse.json({ success: false, message: 'Cancellation charge needs a non-negative amount and flat or per MT mode.' }, { status: 400 });
      }
      cancellationCharge = { amount: charge, mode };
    }

    if (requiresApproval) {
      const now = new Date();
      for (const row of requested) {
        const from = row.status || 'Open';
        row.statusRequest = {
          action,
          reason,
          by: user.id,
          at: now,
          cancellationCharge: cancellationCharge || { amount: 0, mode: 'flat' }
        };
        row.statusHistory.push({ action: `${action} Requested`, from, to: from, reason, by: user.id, at: now });
      }
      await order.save();
      try { await notifyOrderStatusApprovers(user, orderNo, requested, action, reason); }
      catch (notificationError) { console.error('Could not notify order status approvers:', notificationError); }
      return NextResponse.json({ success: true, requiresApproval: true, message: `${action} request sent for approval.`, data: order, impact });
    }

    const now = new Date();
    for (const row of requested) {
      const from = row.status || 'Open';
      const to = action === 'Hold' ? 'Hold' : action === 'Resume' ? 'Open' : 'Cancelled';
      row.status = to;
      row.statusReason = reason;
      row.statusChangedBy = user.id;
      row.statusChangedAt = now;
      if (action === 'Hold' && body.holdUntil) row.holdUntil = new Date(body.holdUntil);
      if (action === 'Resume') row.holdUntil = null;
      row.statusRequest = undefined;
      if (cancellationCharge) {
        row.cancellationCharges = cancellationCharge.amount;
        row.cancellationChargeMode = cancellationCharge.mode;
      }
      row.statusHistory.push({ action, from, to, reason, by: user.id, at: now });
    }

    if (action === 'Cancel') {
      for (const { purchase } of relevantPurchases) {
        purchase.panelStatus = 'Cancelled';
        await purchase.save();
      }
      for (const negotiation of negotiationsToCancel) {
        negotiation.panelStatus = 'Cancelled';
        // Vehicle master records are not reserved directly in this app; clearing
        // the negotiation assignment releases the selected vehicle for reuse.
        if (negotiation.approval) {
          negotiation.approval.vehicleId = '';
          negotiation.approval.vehicleNo = '';
          negotiation.approval.vehicleData = null;
        }
        await negotiation.save();
      }
      await ConsignmentNote.updateMany(companyScopeFilter(user, { _id: { $in: relevantLrs.filter((lr) => !lockedLrs.includes(lr)).map((lr) => lr._id) } }), { $set: { 'header.status': 'Cancelled' } });
    }

    const remaining = order.plantRows.filter((row) => !targetIds.has(idOf(row)));
    const finalRows = [...remaining, ...requested];
    if (action === 'Cancel' && cancellationCharge) {
      order.cancellationCharges = cancellationCharge.amount;
      order.cancellationChargeMode = cancellationCharge.mode;
    }
    if (finalRows.length && finalRows.every((row) => row.status === 'Cancelled')) order.panelStatus = 'Cancelled';
    else if (finalRows.some((row) => row.status === 'Hold')) order.panelStatus = 'Partially on hold';
    else if (order.panelStatus === 'Partially on hold' || order.panelStatus === 'Cancelled') order.panelStatus = 'Approved';
    await order.save();
    if (action === 'Hold' || action === 'Cancel') {
      try { await notifyOrderTeams(user, orderNo, requested, action, reason); }
      catch (notificationError) { console.error('Could not notify order teams:', notificationError); }
    }
    if (['Hold', 'Cancel'].includes(action) && negotiationsNeedingReplacement.length) {
      try { await notifyVnnReplacementNeeded(user, negotiationsNeedingReplacement, orderNo, requested, action); }
      catch (notificationError) { console.error('Could not notify VNN users about cancelled linked orders:', notificationError); }
    }
    return NextResponse.json({ success: true, message: `Order row status updated: ${action}.`, data: order, impact });
  } catch (error) {
    console.error('Order status update failed:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to update order status.' }, { status: 500 });
  }
});

function purchaseRowsMatchFallback(rows = [], orderNo, requested = []) {
  return rows.some((row) => row.orderNo === orderNo && requested.some((source) => {
    const sourcePlant = source.plantCodeValue || source.plantName || source.plantCode;
    const purchasePlant = row.plantCode || row.plantName;
    const plantMatches = !sourcePlant || !purchasePlant || same(sourcePlant, purchasePlant);
    const fromMatches = !source.fromName && !row.fromName || same(source.fromName || source.from, row.fromName || row.from);
    const toMatches = !source.toName && !row.toName || same(source.toName || source.to, row.toName || row.to);
    return plantMatches && fromMatches && toMatches;
  }));
}

function same(left, right) { return String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase(); }

async function notifyOrderTeams(user, orderNo, rows, action, reason) {
  const recipients = await CompanyUser.find({ companyId: user.companyId, isActive: { $ne: false } }).select('_id modules').lean();
  const targetModules = ['Pricing Panel', 'Purchase Panel', 'Advance Payment', 'Billing', 'Balance Payment'];
  const assignedTo = recipients.filter((recipient) => targetModules.some((name) => {
    const module = recipient.modules instanceof Map ? recipient.modules.get(name) : recipient.modules?.[name];
    return module?.selected && (module.permissions?.view || module.permissions?.create || module.permissions?.approve);
  })).map((recipient) => recipient._id);
  if (!assignedTo.length) return;
  await Notification.insertMany(assignedTo.map((recipientId) => ({
    user: user.id,
    company: user.companyId,
    assignedTo: recipientId,
    type: `order-${action.toLowerCase()}`,
    message: `Order ${orderNo} ${rows.length === 1 ? `row ${rows[0].plantName || rows[0]._id}` : 'rows'} ${action === 'Hold' ? 'placed on hold' : 'cancelled'}. Reason: ${reason}`,
  })));
}

async function notifyOrderStatusApprovers(user, orderNo, rows, action, reason) {
  const approvers = await CompanyUser.find({ companyId: user.companyId, isActive: { $ne: false } }).select('_id modules').lean();
  const assignedTo = approvers.filter((recipient) => {
    const module = recipient.modules instanceof Map ? recipient.modules.get('Order Panel') : recipient.modules?.['Order Panel'];
    return module?.selected && module.permissions?.approve;
  }).map((recipient) => recipient._id);
  if (!assignedTo.length) return;
  await Notification.insertMany(assignedTo.map((recipientId) => ({
    user: user.id,
    company: user.companyId,
    assignedTo: recipientId,
    type: 'order-status-approval',
    message: `${action} approval requested for order ${orderNo} (${rows.map((row) => row.plantName || row._id).join(', ')}). Reason: ${reason}`
  })));
}

async function notifyVnnReplacementNeeded(user, negotiations, orderNo, rows, action) {
  const companyUsers = await CompanyUser.find({ companyId: user.companyId, isActive: { $ne: false } }).select('_id modules').lean();
  const recipients = new Set();
  for (const negotiation of negotiations) {
    if (negotiation.createdBy) recipients.add(String(negotiation.createdBy));
  }
  for (const recipient of companyUsers) {
    const module = recipient.modules instanceof Map ? recipient.modules.get('Vehicle Negotiation') : recipient.modules?.['Vehicle Negotiation'];
    if (module?.selected && (module.permissions?.edit || module.permissions?.create)) recipients.add(String(recipient._id));
  }
  if (!recipients.size) return;
  const missing = rows.map((row) => row.plantName || row._id).join(', ');
  await Notification.insertMany([...recipients].map((recipientId) => ({
    user: user.id,
    company: user.companyId,
    assignedTo: recipientId,
    type: 'vnn-replacement-needed',
    message: `Order ${orderNo} row(s) ${missing} were ${action === 'Hold' ? 'put on hold' : 'cancelled'} in VNN ${negotiations.map((negotiation) => negotiation.vnnNo).join(', ')}. Add replacement open order rows and submit Part 1 again.`
  })));
}
