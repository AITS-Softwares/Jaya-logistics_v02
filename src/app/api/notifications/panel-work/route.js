import { NextRequest, NextResponse } from 'next/server';
import { withBranchAccess } from '@/lib/branchAccess';
import { pushIdentity } from '@/lib/pushAuth';
import { companyScopeFilter } from '@/lib/companyScope';
import { buildPanelWorkSummaries } from '@/lib/panelWorkPolicy.mjs';
import OrderPanel from '@/app/api/order-panel/OrderPanel';
import VehicleNegotiation from '@/app/api/vehicle-negotiation/VehicleNegotiation';
import PricingPanel from '@/app/api/pricing-panel/PricingPanel';
import LoadingPanel from '@/app/api/loading-panel/LoadingPanel';
import ConsignmentNote from '@/app/api/consignment-note/ConsignmentNote';
import PurchasePanel from '@/app/api/purchase-panel/PurchasePanel';
import AdvancePayment from '@/app/api/Advance-Payment/AdvancePayment';
import POD from '@/app/api/pod-panel/POD';
import BalancePayment from '@/app/api/balance-payment/BalancePayment';
import { GET as vnnCreation } from '@/app/api/vehicle-negotiation/route';
import { GET as pricingCreation } from '@/app/api/pricing-panel/reference-data/route';
import { GET as loadingCreation } from '@/app/api/loading-panel/reference-data/route';
import { GET as lrCreation } from '@/app/api/consignment-note/route';
import { GET as purchaseCreation } from '@/app/api/purchase-panel/reference-data/route';
import { GET as paymentOrPodCreation } from '@/app/api/purchase-panel/route';
import { GET as balanceCreation } from '@/app/api/balance-payment/pod-lookup/route';

const models = { OrderPanel, VehicleNegotiation, PricingPanel, LoadingPanel, ConsignmentNote, PurchasePanel, AdvancePayment, POD, BalancePayment };
const creators = { vnn: vnnCreation, pricing: pricingCreation, loading: loadingCreation, lr: lrCreation, purchase: purchaseCreation,
  advance: paymentOrPodCreation, pod: paymentOrPodCreation, balance: balanceCreation };

async function getPanelWork(req) {
  try {
    const user = await pushIdentity(req);
    if (!user.activeOperatingCompanyId) return NextResponse.json({ success: true, records: [], warnings: [] });
    const result = await buildPanelWorkSummaries({ user,
      // Invoke the same handlers as the list-page chips, without an HTTP loopback
      // or a second copy of the business eligibility rules.
      countCreation: async panel => {
        const request = new NextRequest(new URL(panel.createEndpoint, req.url), { headers: req.headers });
        const response = await creators[panel.key](request, {});
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error('Pending count unavailable.');
        return data.data?.count || 0;
      },
      countApproval: (panel, filter) => models[panel.model].countDocuments(companyScopeFilter(user, filter)),
    });
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return NextResponse.json({ success: false, message: error.status ? error.message : 'Unable to load panel work.' }, { status: error.status || 500 }); }
}
export const GET = withBranchAccess(getPanelWork);
