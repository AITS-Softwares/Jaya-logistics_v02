// Read persisted Frappe state; never infer dispatch outcome from HTTP errors.
export function ewaybillStatusMethod(env = process.env) {
  return env.FRAPPE_EWAYBILL_STATUS_METHOD || (env.FRAPPE_EWAYBILL_GENERATE_METHOD?.endsWith('.generate')
    ? env.FRAPPE_EWAYBILL_GENERATE_METHOD.replace(/\.generate$/, '.status') : '');
}
export async function recoverEwaybill(client, method, payload) {
  if (!method) throw new Error('ERPNext status method is not configured.');
  const {company,gstin,external_id,source_company_id,source_company_code} = payload;
  const status = await client.call(method,{company,gstin,external_id,source_company_id,source_company_code});
  const patch = {'ewaybill.apiState':'uncertain'};
  if (status.requestName) patch['ewaybill.requestName'] = status.requestName;
  if (['Ready','Draft'].includes(status.state)) {
    Object.assign(patch,{'ewaybill.apiState':'idle','ewaybill.previewToken':'','ewaybill.preparedVersion':''});
    return {patch,message:'ERPNext confirms generation was not dispatched. Correct the issue and preview again.'};
  }
  const result = status.result;
  if (status.state === 'Generated' && /^\d{12}$/.test(String(result?.ewaybillNo || '')) && Number.isFinite(Date.parse(result?.expiryDate))) {
    Object.assign(patch,{'ewaybill.apiState':'complete','ewaybill.ewaybillNo':String(result.ewaybillNo),'ewaybill.expiryDate':result.expiryDate,'ewaybill.source':'generated','ewaybill.verifiedAt':new Date()});
    if (Number(result.distance) > 0 && Number(result.distance) <= 4000) patch['ewaybill.distance'] = Number(result.distance);
    return {patch,message:'Recovered the issued e-way bill from ERPNext. Use Fetch & Verify to retrieve its PDF.'};
  }
  return {patch,message:'ERPNext is processing this request or its outcome is uncertain. Reconcile before generating again.'};
}
