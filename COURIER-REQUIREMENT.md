# Deferred requirement: courier orders

Recorded on 12 November 2026. The user requested saving this requirement for later; do not implement until asked.

## User requirement

The company also dispatches orders through couriers. Add Courier as an order type. Courier orders should appear in Order Panel and Billing, and bypass all intermediate transport panels.

## Proposed approach (not yet approved implementation details)

- Flow: Order Panel → approval → Billing.
- Exclude courier orders from Vehicle Negotiation, Pricing, Loading Info, Purchase, Consignment Note/LR, Advance Payment, Balance Payment, and POD workflows.
- Billing must source courier orders directly instead of requiring a Consignment Note.
- Suggested courier fields: courier company, AWB/tracking number, dispatch date, destination, packages/weight, and customer charge.
- Suggested dedicated Courier tab within Billing, with preview/PDF showing order and AWB references.
- Prevent duplicate billing using the order/row ID; protect billed amounts from later edits.

## Decisions still open

- Manual courier charge versus weight × rate.
- Courier as an order type (user's request) versus a separate Delivery Mode preserving Sales/STO/Export/Import (assistant suggestion only).
- Exact fields, approval/dispatch eligibility, billing layout, and correction rules.

No courier functionality has been implemented.
