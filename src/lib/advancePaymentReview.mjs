const numericFields = new Set(['rate', 'weight', 'amount', 'advance', 'finalAmount', 'purchaseAmountFromVNN', 'totalAmount', 'totalAddition', 'totalDeduction', 'collectionCharges', 'cancellationCharges', 'loadingCharges', 'otherCharges', 'noOfLoadingPoints', 'noOfDroppingPoints']);
const ignored = new Set(['_id', 'id', '__v', 'createdAt', 'updatedAt', 'subCompanyId', 'subCompanyName', 'subCompanyCode']);

export function advanceMaterialProjection(record) {
  const plain = record.toObject ? record.toObject({ depopulate: true }) : record;
  const clean = (value, key = '') => {
    if (value?._bsontype === 'ObjectId') return String(value);
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => clean(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort()
      .filter((name) => !ignored.has(name) && value[name] !== '' && value[name] != null)
      .map((name) => [name, clean(value[name], name)]));
    if (numericFields.has(key) && Number.isFinite(Number(value))) return Number(value);
    return value;
  };
  const details = plain.paymentDetails || {};
  return clean({
    header: plain.header, billing: plain.billing, orderRows: plain.orderRows,
    purchaseTerms: plain.purchaseTerms, vendorDetails: plain.vendorDetails,
    additions: plain.additions, deductions: plain.deductions,
    purchaseAmountFromVNN: plain.purchaseAmountFromVNN, memoFile: plain.memoFile,
    paymentDetails: Object.fromEntries(Object.entries(details).filter(([key]) => !['paymentStatus', 'remarks'].includes(key))),
  });
}

export function isAdvanceStatusUpdate(body) {
  return body.paymentDetails && Object.keys(body).every((key) => ['id', 'paymentDetails', 'expectedFinalAmount'].includes(key))
    && Object.keys(body.paymentDetails).every((key) => ['paymentStatus', 'remarks'].includes(key));
}

export function changedApprovedAdvanceBankFields(record, body) {
  if (record.paymentDetails?.paymentStatus !== 'Approved') return [];
  const protectedFields = {
    vendorDetails: ['vendorCode', 'vendorName', 'accountNo', 'bankName', 'ifsc', 'transactionId'],
    paymentDetails: ['vendorNameDebit', 'accountNoCredit', 'bankVendorCode', 'transactionId'],
  };
  const changed = [];
  for (const [section, fields] of Object.entries(protectedFields)) {
    for (const field of fields) {
      if (body[section]?.[field] === undefined) continue;
      if (String(body[section][field] ?? '').trim() !== String(record[section]?.[field] ?? '').trim()) changed.push(`${section}.${field}`);
    }
  }
  return changed;
}
