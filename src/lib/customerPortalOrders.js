import mongoose from 'mongoose';
import { customerOrderFilter, customerOrderView } from '@/lib/customerPortalPolicy.mjs';
import { portalError } from '@/lib/customerPortalAuth';

// Read only the customer-visible fields. Raw collections avoid staff branch context;
// tenant/customer/operating-company scope is mandatory and constructed here instead.
const projection = {
  _id: 1, companyId: 1, customerId: 1, subCompanyId: 1, subCompanyName: 1, subCompanyCode: 1,
  orderPanelNo: 1, date: 1, panelStatus: 1, branchName: 1, delivery: 1, approvedAt: 1,
  'plantRows.plantCodeValue': 1, 'plantRows.orderType': 1, 'plantRows.pinCode': 1,
  'plantRows.talukaName': 1, 'plantRows.districtName': 1, 'plantRows.stateName': 1,
  'plantRows.countryName': 1,
  'plantRows._id': 1, 'plantRows.plantName': 1, 'plantRows.fromName': 1,
  'plantRows.toName': 1, 'plantRows.weight': 1, 'plantRows.status': 1,
};

export function portalOrdersScope(access) {
  return customerOrderFilter({
    companyId: access.user.companyId, customerId: access.user.customerId,
    operatingCompanyIds: access.companies.map(company => company._id),
  });
}

export async function findCustomerOrder(access, id) {
  if (!mongoose.isValidObjectId(id)) throw portalError('Order not found.', 404);
  const order = await mongoose.connection.db.collection('orderpanels').findOne({
    ...portalOrdersScope(access), _id: new mongoose.Types.ObjectId(id),
  }, { projection });
  if (!order) throw portalError('Order not found.', 404);
  return order;
}

export async function customerOrderViews(access, orders) {
  if (!orders.length) return [];
  const loadings = await mongoose.connection.db.collection('loadingpanels').find({
    companyId: access.user.companyId, subCompanyId: { $in: access.companies.map(company => company._id) },
    isDeleted: { $ne: true }, isDraft: { $ne: true }, panelStatus: { $in: ['Approved', 'Completed'] },
    reapprovalState: { $in: [null, 'none'] },
    'orderRows.orderPanelId': { $in: orders.map(order => String(order._id)) },
  }, { projection: {
    _id: 1, companyId: 1, subCompanyId: 1, panelStatus: 1, isDraft: 1, isDeleted: 1,
    'vehicleInfo.vehicleNo': 1, 'orderRows.orderPanelId': 1, 'orderRows.orderRowId': 1,
  } }).toArray();
  const negotiations = await mongoose.connection.db.collection('vehiclenegotiations').find({
    companyId: access.user.companyId, subCompanyId: { $in: access.companies.map(company => company._id) },
    isDeleted: { $ne: true }, panelStatus: { $ne: 'Cancelled' },
    reapprovalState: { $in: [null, 'none'] }, 'approval.part3Status': 'Approved',
    'orders.orderPanelId': { $in: orders.map(order => String(order._id)) },
  }, { projection: {
    _id: 1, companyId: 1, subCompanyId: 1, 'approval.vehicleNo': 1,
    'orders.orderPanelId': 1, 'orders.orderRowId': 1,
  } }).toArray();
  return orders.map(order => customerOrderView(order, loadings, negotiations));
}

export async function listCustomerOrders(access, params) {
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.get('page')) || 1)));
  const q = String(params.get('q') || '').trim().slice(0, 100);
  const filter = portalOrdersScope(access);
  if (q) filter.orderPanelNo = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const collection = mongoose.connection.db.collection('orderpanels');
  const total = await collection.countDocuments(filter);
  const orders = await collection.find(filter, { projection }).sort({ date: -1, _id: -1 }).skip((page - 1) * 20).limit(20).toArray();
  return { orders: await customerOrderViews(access, orders), total, page, pageCount: Math.max(1, Math.ceil(total / 20)) };
}
