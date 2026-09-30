# JAYA GROUP operating-company release runbook

1. Back up production and prove the backup can be restored.
2. Deploy this release to staging with a restored production copy.
3. Run the migration **without** `--apply`; compare each candidate count with the database.
4. Put production transaction creation and edits into maintenance mode, then take a fresh backup.
5. Run the same command with `--apply`. It assigns historical orphaned records and legacy users with no explicit company assignment to JGL, and preserves current document numbers in `legacyDocumentNumber`; it does not rewrite primary numbers or delete data.
6. Verify that every migrated record has `subCompanyId`, that JGL totals match the pre-migration totals, and that JL/NK return zero historical JGL records.
7. Create one record of each type in JGL, JL and NK. Confirm the generated numbers start with the correct code and do not overlap.
8. Disable the temporary JGL legacy fallback in `src/lib/companyScope.js` only after the migration reconciliation is signed off.

## JAYA GROUP administrator workflow

Company login opens **JAYA GROUP · Consolidated**, which is read-only. Before opening an Order, VNN, Pricing, Loading, Purchase, LR, POD or payment screen, select **Workspace · Jaya Global Logistics**, **Jaya Logistics**, or **Neelkanth** from the header selector. This securely renews the admin token with that one operating-company scope. Selecting **JAYA GROUP · Consolidated** again returns to the read-only group overview.

The migration command is:

```powershell
$env:MONGODB_URI = '<production connection string>'
node src/scripts/migrate-jgl-operating-company.mjs --company-id '<JAYA GROUP Company _id>'
node src/scripts/migrate-jgl-operating-company.mjs --company-id '<JAYA GROUP Company _id>' --apply
```

Never run `--apply` before reviewing the dry-run result. The script is idempotent because it only selects records where `subCompanyId` is missing or null.
