'use client';
import VnnOrderDetailsView from '@/components/VnnOrderDetailsView';
export default function VnnOrderView({ selection, onClose }) {
  if (!selection) return null;
  const params = new URLSearchParams({ vnnId: selection.vnId });
  if (/^[a-f\d]{24}$/i.test(selection.orderPanelId || '')) params.set('orderId', selection.orderPanelId);
  if (selection.orderNo) params.set('orderNo', selection.orderNo);
  return <VnnOrderDetailsView query={params.toString()} orderNo={selection.orderNo} subtitle="Vehicle Negotiation · Source order" onClose={onClose} />;
}
