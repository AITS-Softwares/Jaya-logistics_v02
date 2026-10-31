# Supplier and Rate Master approval

This change covers the two masters only. Location Master has no approval. Payment and other transaction pages/APIs have not been edited.

## Behavior

- New suppliers and rate masters start Pending and are unavailable in operational dropdowns until approved.
- All supplier edits require approval. Rate Master title edits remain immediate; rate slabs, customer/branch, rules and customer approval evidence require approval.
- An approved record remains usable with its approved values while proposed changes wait. Proposal fields are never returned by ordinary operational lookups.
- Company/Admin accounts and users with the master's Approve permission can approve; Reject is separately permission-controlled. Nobody can approve or reject their own submission, including Company/Admin accounts.
- Open Supplier Management or Rate Master management/list to use the approval register. Filter Pending, Approved, Rejected or All; Pending includes proposed changes to approved records. Review shows the maker and field comparisons.
- Reject requires a reason. Correct and resubmit the same document. Supplier edit and Rate Master edit forms load the current/rejected proposal for correction.
- A different maker cannot replace an active proposal. The same maker can supersede it. Stale or repeated reviews return a conflict.
- Rate cleanup and individual slab removal submit proposals. Rate history is written with approval in a Mongo transaction.
- Supplier Frappe sync sends approved live values only. Failure after approval does not undo approval.

## Approve older records through the app

After deploying this code, log in as a Company account or Admin, open Supplier Management or Rate Master management/list, and select **Existing records** in the approval register. Click **Review**, inspect the details, then **Approve existing record**. Repeat for each older record.

This action is restricted on the server to administrators and documents whose stored approvalStatus and submission metadata are absent. It records the actual administrator and time with a LEGACY_APPROVED audit entry. It cannot approve a normal Pending/Rejected submission or bypass maker-checker. Concurrent/repeated requests fail cleanly. Existing values are retained, without resetting rates or modifying any other panel.

No migration command is needed if you choose individual approval in the app. Until an older record is approved it remains unavailable in operational selections. The bulk migration below remains an optional alternative for retaining all existing records as approved during a release.

## Before deployment

The migration is NOT run automatically. Do not deploy approved-only lookups before migrating existing masters, or masters without a stored approvalStatus will be hidden.

1. Take and verify a database backup using the existing backup procedure.
2. Schedule a short pause in Supplier and Rate Master writes. Keep it paused through migration and deployment.
3. In the checkout containing this script, set a connection URI privately in an environment variable named MASTER_APPROVAL_MONGO_URI. Do not paste credentials into chat or commit them.
4. Preview the exact database (replace YOUR_DATABASE):

   ```sh
   node scripts/migrate-master-approval.mjs --db=YOUR_DATABASE
   ```

5. Review counts, duplicate-code checks and unexpected statuses. When correct, apply manually:

   ```sh
   node scripts/migrate-master-approval.mjs --db=YOUR_DATABASE --apply
   ```

6. Run the dry-run again. Missing status count must be zero. Existing Pending/Rejected statuses are preserved. Grandfathering logs do not claim a person approved existing records.
7. Build and deploy using the project's normal process, then complete the tests below before resuming master writes. Remove the temporary connection environment variable when done.

The migration only updates Supplier/RateMaster metadata and adds supplier code reservation indexes. It does not clear any records, reset counters, change rates, or modify payments. A replica set (including Atlas) is required for Mongo transactions.

## Local verification

```sh
node scripts/test-master-approval.mjs
node --experimental-vm-modules scripts/test-master-approval-service.mjs
node --experimental-vm-modules scripts/test-master-approval-migration.mjs
```

These run offline with actual Mongoose validation and simulated persistence/session behavior. They do not load connection credentials or access the database. A successful offline test does not replace database-backed review/rollback testing.

## Manual test checklist on a restored database

- Create each master as a maker: Pending in management, absent from operational lookup. POST cannot forge approval fields.
- Sign in as another account with Approve permission: review and approve; the master becomes selectable.
- Try self-approval and self-rejection as staff and Company/Admin: both denied by the API.
- Edit a supplier bank field and a contact field: both stay in the proposal until approved; original approved fields remain available.
- Reject a new record, correct it and resubmit the same ID. Reject an approved record's proposed change: live values unchanged, reason retained, correction prefilled.
- Replace a proposal as its maker, then review an old open revision: conflict. Try replacement from another maker: conflict.
- Bulk upload: created rows are pending; sensitive edits cannot change approved live fields. Conflicting rows report individual errors.
- Rate cleanup, slab edit and slab removal: no immediate live change; approval writes history. Rejection writes no rate history.
- Review with only Approve or only Reject permission; check actions are separately enforced. Remove permission or disable account while review is open: server denies it.
- Repeat approval twice and submit simultaneous approvals: only one succeeds. Inject a history-write failure on the test database: master/history changes roll back together.
- Cross-company IDs are denied. Operational lookup responses contain no proposals or rejected-bank payloads.
- Migration rerun changes no approval decisions. Existing master records remain available after migration.
- Location Master remains on its existing create/edit flow.

No database migration, server deployment, external supplier sync or notification delivery was executed during local implementation.

Local result: all three offline suites passed, approval-related JavaScript passed Next SWC compilation, and git diff whitespace checks passed. Full npm run build was blocked by Windows EPERM creating .next/server/app/api; a successful production build and database-backed smoke test are still required before deployment.
