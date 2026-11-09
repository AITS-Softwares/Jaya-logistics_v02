# PDI Panel

Open `/admin/pdi-panel`. PDI is optional and never gates Vehicle Negotiation or changes order quantities/weights. Completed means all current material rows have inspection entries, independently of packing status or available quantity.

## Access

Company/Admin users have access through existing admin rules. For existing staff, open Permissions, select the user, enable **PDI Panel**, grant **view** and (for inspectors) **edit**, then save. Have the user sign in again to refresh their token/session. No staff permissions are granted automatically. PDI summaries on transaction screens require view access to an applicable transaction module and remain scoped to accessible source orders, company and operating company. Order reads use the existing branch scope plugin inside withBranchAccess.

## Behaviour

- Each pack row has independent packing status and editable available quantity. Selecting status prefills quantity; subsequent manual edits are retained.
- Save changed rows only; untouched rows remain pending. Existing entries merge on the server. Quantities must be finite numbers from zero to ordered quantity.
- For loose cargo without package quantity, use actual weight in its UOM; for nonuniform cargo use nos. Units are displayed explicitly.
- Current materials are compared to saved fingerprints. Changed products, quantities, SKU, pack details, route or weight require reinspection. Removed materials no longer count toward completion.
- Held/cancelled lanes cannot be edited. Ambiguous legacy materials without a route link cannot be edited when a lane is held/cancelled.
- Inspection edits record before/after history and identity/time. Revision conflicts return HTTP 409; reload before editing again.
- VNN list shows PDI per order, with expandable material details; shared Order Panel and VNN order detail views show the same latest summary.

## Verification

`node scripts/test-pdi-panel.mjs` tests rules and API handlers with mocked persistence, including partial merge, independent status/quantity, completion, stale materials, invalid IDs/quantities, holds, cancellation, history, conflicts and permission denial.

`node scripts/test-cancelled-vnn-replacement.mjs` verifies the existing negotiation replacement flow.

Changed JSX files were compiled with Next SWC. Production build was attempted but failed with EPERM creating `.next/server/app/api/ppc/operatorMachineMappings/[id]` on Windows. Live browser/database persistence has not been verified.

Manual smoke check: use an approved open order, save one material, reload and confirm In Progress; finish remaining materials (including Not Packed) and confirm Completed; manually override quantity under any status; verify VNN still works with Pending PDI; confirm summaries; inspect history; check restricted staff and held/cancelled routes.
