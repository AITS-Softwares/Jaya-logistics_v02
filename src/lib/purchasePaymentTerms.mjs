export const LPT_1000_BALANCE_ONLY = 'LPT- 1000 Balance Only';

const fixedBalances = new Map([
  ['Rs.10,000/- Balance Only', 10000],
  ['Rs. 5000/- Balance Only', 5000],
  [LPT_1000_BALANCE_ONLY, 1000],
]);

export function advanceForFixedBalance(paymentTerm, purchaseAmount) {
  const balance = fixedBalances.get(paymentTerm);
  return balance === undefined ? undefined : Math.max(0, purchaseAmount - balance);
}
