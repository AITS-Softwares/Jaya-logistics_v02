const panelTypes={
  'order-panel':'order',
  'vehicle-negotiation':'vnn',
  'pricing-panel':'pricing',
  'Loading-Info':'loading',
  'Consignment-Note':'lr',
};
export function reapprovalRecordForPath(pathname) {
  if(typeof pathname!=='string')return null;
  const match=pathname.match(/^\/admin\/([^/]+)\/(?:(?:approve|view|edit)\/)?([a-fA-F0-9]{24})(?:\/[^?#]*)?$/);
  const type=match && panelTypes[match[1]];
  return type?{type,id:match[2]}:null;
}
