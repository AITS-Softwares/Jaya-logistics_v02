import mongoose from 'mongoose';
import { requireCustomer, customerApiResponse, customerApiFailure, portalError } from '@/lib/customerPortalAuth';
import { findCustomerOrder, portalOrdersScope } from '@/lib/customerPortalOrders';
import { loadingMatchesDrop } from '@/lib/customerPortalPolicy.mjs';
import { liveTrackingStatus } from '@/lib/driverLiveTracking.mjs';

export async function GET(req, context) {
  try {
    const access = await requireCustomer(req);
    const { id } = await context.params;
    const order = await findCustomerOrder(access, id);
    const dispatchId = new URL(req.url).searchParams.get('dispatchId');
    if (!mongoose.isValidObjectId(dispatchId)) throw portalError('Dispatch not found.', 404);
    const db = mongoose.connection.db;
    const loading = await db.collection('loadingpanels').findOne({
      _id: new mongoose.Types.ObjectId(dispatchId), companyId: access.user.companyId,
      subCompanyId: order.subCompanyId, isDeleted: { $ne: true }, isDraft: { $ne: true },
      panelStatus: { $in: ['Approved', 'Completed'] }, reapprovalState: { $in: [null, 'none'] },
    });
    if (!loading || !(order.plantRows || []).some(row => loadingMatchesDrop(loading, order, row))) throw portalError('Dispatch not found.', 404);
    // Location on a shared vehicle can disclose other customers' deliveries.
    // Only release location when EVERY linked order belongs to this customer and scope.
    const links = loading.orderRows || [];
    if (!links.length || links.some(row => !mongoose.isValidObjectId(row.orderPanelId))) throw portalError('Tracking is unavailable for this dispatch.', 409);
    const ids = [...new Set(links.map(row => String(row.orderPanelId)))];
    const owned = await db.collection('orderpanels').countDocuments({ ...portalOrdersScope(access), _id: { $in: ids.map(value => new mongoose.Types.ObjectId(value)) } });
    if (owned !== ids.length) throw portalError('Tracking is unavailable for this shared dispatch.', 409);
    const trip = await db.collection('drivertrips').findOne({
      companyId: access.user.companyId, loadingId: loading._id,
      state: { $in: ['started', 'at_pickup', 'in_transit', 'at_stop'] },
    }, { sort: { updatedAt: -1 }, projection: { _id: 1, state: 1, startedAt: 1 } });
    if (!trip) return customerApiResponse({ tracking: { available: false, message: 'No active tracked trip for this vehicle yet.' } });
    const session = await db.collection('trackingsessions').findOne({ companyId: access.user.companyId, tripId: trip._id }, { sort: { startedAt: -1 } });
    if (!session || session.state === 'ended') return customerApiResponse({ tracking: { available: false, message: 'Location sharing is not active.' } });
    const point = await db.collection('locationpoints').findOne({
      companyId: access.user.companyId, tripId: trip._id, sessionId: session._id, isMocked: { $ne: true },
      recordedAt: { $gte: session.startedAt, $lte: new Date() },
    }, { sort: { recordedAt: -1 }, projection: { latitude: 1, longitude: 1, recordedAt: 1, accuracyM: 1 } });
    const status = liveTrackingStatus(session, point);
    const fresh = status === 'active' && point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
    return customerApiResponse({ tracking: {
      available: !!fresh, vehicleNo: loading.vehicleInfo?.vehicleNo || '', tripState: trip.state,
      status, updatedAt: point?.recordedAt || null,
      location: fresh ? { latitude: point.latitude, longitude: point.longitude, accuracyM: point.accuracyM } : null,
      message: fresh ? 'Latest vehicle location' : 'Waiting for a fresh location update from the vehicle.',
    } });
  } catch (error) { return customerApiFailure(error); }
}
