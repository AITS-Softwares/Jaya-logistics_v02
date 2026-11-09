'use client';
import VnnOrderDetailsView from '@/components/VnnOrderDetailsView';
export const orderDate = value => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) : '—';
};
export const orderWeight = rows => (rows || []).reduce((sum, row) => sum + (Number(row.weight) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
export default function AwaitingOrderView({ order, onClose, previewEndpoint }) {
  const params = new URLSearchParams({ orderId: order.id });
  return <VnnOrderDetailsView endpoint={previewEndpoint} query={params.toString()} orderNo={order.orderNo} subtitle="Awaiting Order Approval · Early review" earlyReview onClose={onClose} />;
}
