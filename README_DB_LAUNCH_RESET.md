# Jaya: back up the main database and reset Order-to-Billing for launch

Run these commands yourself. Creating this README does not connect to or change any database.

## Scope

| Item | Result |
| --- | --- |
| Main database | `jaya`; logistics workflow reset across **all companies** |
| Local backup | Full compressed archive in `Documents\Jaya-DB-Backups` |
| Retained MongoDB backup | Full restored database named `jaya_prelaunch_backup_TIMESTAMP` |
| Optional test database | `jaya_reset_test_TIMESTAMP`; disposable, separate from the retained backup |
| First panel number | Ends in `0001`, per operating company and document type |
| First sequential bill | Ends in `001`, for general/product-wise/mosaic bills |

The reset preserves master data, users, driver profiles/devices, unrelated ERP transactions, collection indexes, notification history, uploaded files and `_bak_` collections. Logistics bills are stored in `savedreports` and are included in the reset. Inventory credit notes belong to a different workflow and are excluded.

A backup database on the same cluster is a recovery copy, not an independent disaster backup. Keep the local archive too. Restored TTL indexes can expire old tracking documents; the archive retains the exported data. This database dump does not include externally stored files or MongoDB user accounts/roles.

Collection names and counter fields were checked against local source. The live database, its counts and its backup status have not been inspected by this README's author.

## 1. Stop writers and prepare PowerShell

Stop every app instance, worker, scheduled job and other writer that uses `jaya`. Prevent mobile clients from writing during the maintenance window. Keep them stopped through backup, verification and reset.

Have MongoDB Database Tools and `mongosh` installed. Your database account and Atlas IP access must permit backup, restore, listing databases and resetting records. Ensure enough disk and MongoDB storage for the backups; rehearsal needs another database copy.

Open PowerShell and run:

```powershell
$ErrorActionPreference = "Stop"

Set-Location "C:\Users\ANURAJ\Downloads\mongodb-database-tools-windows-x86_64-100.19.0\mongodb-database-tools-windows-x86_64-100.19.0\bin"

Get-Command .\mongodump.exe, .\mongorestore.exe, mongosh | Select-Object Name, Source

$dbUri = Read-Host "Enter your current MongoDB URI for jaya"
$dbName = "jaya"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$mongoBackupDb = "${dbName}_prelaunch_backup_$stamp"
$testDb = "${dbName}_reset_test_$stamp"

$backupFolder = Join-Path $env:USERPROFILE "Documents\Jaya-DB-Backups"
New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
$archive = Join-Path $backupFolder "${dbName}-before-launch-${stamp}.archive.gz"
$manifest = Join-Path $backupFolder "${dbName}-before-launch-${stamp}.json"

$env:JAYA_BACKUP_DB = $mongoBackupDb
$env:JAYA_RESET_TEST_DB = $testDb

Write-Host "Main database: $dbName"
Write-Host "Local archive: $archive"
Write-Host "Retained MongoDB backup: $mongoBackupDb"
```

Keep this PowerShell window open; later steps reuse its variables. If the URI includes a database path, it must specify `jaya`. Never paste credentials into this file or chat. Use the current password; rotate the previously shared password if it is still active.

**If a command fails, stop. Do not continue to deletion.**

## 2. Save a full backup on your computer

Run in the same PowerShell window:

```powershell
.\mongodump.exe --uri="$dbUri" --db="$dbName" --archive="$archive" --gzip

if ($LASTEXITCODE -ne 0) { throw "Backup failed. Stop here." }
if (!(Test-Path -LiteralPath $archive)) { throw "Archive was not created." }
if ((Get-Item -LiteralPath $archive).Length -eq 0) { throw "Archive is empty." }

$archiveHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash

[ordered]@{
    SourceDatabase = $dbName
    MongoBackupDatabase = $mongoBackupDb
    RehearsalDatabase = $testDb
    Archive = $archive
    SHA256 = $archiveHash
    CreatedAt = (Get-Date).ToString("o")
    Verification = "Pending"
} | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding UTF8

Get-Item -LiteralPath $archive
Write-Host "SHA256: $archiveHash"
Write-Host "Run details: $manifest"
```

Copy the archive and manifest to a second secure drive/location if available. A nonempty archive alone is not proof of a usable backup; complete the restore and checks below.

## 3. Store the backup in MongoDB as a separate database

This restores the archive into a new database and leaves `jaya` unchanged. First check that the destination does not already exist:

```powershell
$destinationCheck = @'
const name = process.env.JAYA_BACKUP_DB;
if (!/^jaya_prelaunch_backup_[0-9]{8}-[0-9]{6}$/.test(name || "")) {
  throw new Error("Invalid backup database name.");
}
if (db.getMongo().getDBNames().includes(name)) {
  throw new Error("Backup destination already exists. Do not overwrite it.");
}
print("New backup destination: " + name);
'@

mongosh "$dbUri" --quiet --eval $destinationCheck
if ($LASTEXITCODE -ne 0) { throw "Destination check failed. Stop here." }

.\mongorestore.exe --uri="$dbUri" --archive="$archive" --gzip --stopOnError `
  --nsInclude="${dbName}.*" `
  --nsFrom="${dbName}.*" `
  --nsTo="${mongoBackupDb}.*"

if ($LASTEXITCODE -ne 0) { throw "MongoDB backup restore failed. Stop here." }

Write-Host "Retain this MongoDB backup: $mongoBackupDb"
```

Do not point the app or workers at the retained backup. Do not reset it or delete it after launch.

## 4. Verify the local and MongoDB backups

The following PowerShell block compares collection lists, document counts and index definitions. It reads data only. It is a structural/count check, not a byte-for-byte comparison of all document contents.

```powershell
$verifyBackup = @'
const backupName = process.env.JAYA_BACKUP_DB;
if (!/^jaya_prelaunch_backup_[0-9]{8}-[0-9]{6}$/.test(backupName || "")) {
  throw new Error("Invalid backup database name.");
}
const source = db.getSiblingDB("jaya");
const backup = db.getSiblingDB(backupName);
const names = source.getCollectionNames().sort();
const copiedNames = backup.getCollectionNames().sort();
if (!names.length || JSON.stringify(names) !== JSON.stringify(copiedNames)) {
  printjson({ source: names, backup: copiedNames });
  throw new Error("Collection lists differ or source is empty.");
}
function indexes(database, name) {
  return database.getCollection(name).getIndexes()
    .map(index => {
      const { ns, ...definition } = index;
      return definition;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
for (const name of names) {
  const sourceCount = source.getCollection(name).countDocuments({});
  const backupCount = backup.getCollection(name).countDocuments({});
  print(name + ": source=" + sourceCount + ", backup=" + backupCount);
  if (sourceCount !== backupCount) {
    throw new Error("Count mismatch: " + name);
  }
  if (EJSON.stringify(indexes(source, name)) !== EJSON.stringify(indexes(backup, name))) {
    throw new Error("Index mismatch: " + name);
  }
}
print("BACKUP STRUCTURE AND COUNTS VERIFIED: " + backupName);
'@

mongosh "$dbUri" --quiet --eval $verifyBackup
if ($LASTEXITCODE -ne 0) { throw "Backup verification failed. Do not reset jaya." }

if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $archiveHash) {
    throw "Archive checksum changed. Stop here."
}

$runDetails = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
$runDetails.Verification = "Structure/count/index comparison passed"
$runDetails | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding UTF8
```

Open the retained MongoDB backup in Compass and inspect several orders, LRs and saved bills. If the automated check reports a mismatch, investigate before proceeding. Views, TTL expiry or index-version differences can require specific handling; do not simply ignore a failure.

## 5. Optional rehearsal: create a separate disposable test copy

Recommended unless you have already rehearsed this exact reset with the current app version. Never rehearse on the retained MongoDB backup.

Run in PowerShell. Use the new, unused `$testDb` generated in step 1; do not repeat a restore into an existing rehearsal database.

```powershell
.\mongorestore.exe --uri="$dbUri" --archive="$archive" --gzip --stopOnError `
  --nsInclude="${dbName}.*" `
  --nsFrom="${dbName}.*" `
  --nsTo="${testDb}.*"

if ($LASTEXITCODE -ne 0) { throw "Rehearsal restore failed. Stop here." }
Write-Host "Rehearsal database: $testDb"
```

After defining the function in step 6, use it against the printed rehearsal database name instead of `jaya`. After checking both backups, set `backupsVerified = true`, preview and then reset that test database. The example names below are placeholders; replace both occurrences with the actual printed name:

```javascript
runReset("jaya_reset_test_YYYYMMDD-HHMMSS", false);
backupsVerified = true;
runReset("jaya_reset_test_YYYYMMDD-HHMMSS", true, "jaya_reset_test_YYYYMMDD-HHMMSS");
```

Test a local app against the rehearsal database. In a separate PowerShell window:

```powershell
Set-Location "C:\Users\ANURAJ\OneDrive\Desktop\CODING\Work\Jaya-logistics_v02"
$env:MONGODB_URI = Read-Host "Enter the full URI pointing to the rehearsal database"
npm run dev
```

Change the URI database path to the rehearsal name while preserving connection options. This temporary process variable takes precedence over `.env.local`. Verify logins/master data, first order `0001`, the full logistics workflow and first sequential bill `001`. Use test integration settings when exercising email, payments or accounting exports.

Stop the test app with Ctrl+C, then clear the override:

```powershell
Remove-Item Env:MONGODB_URI
```

## 6. Define the reset function in mongosh

From the original PowerShell window:

```powershell
mongosh "$dbUri"
```

The next block runs inside **mongosh**, not PowerShell. Defining it deletes nothing. It permits only `jaya` and disposable rehearsal databases; retained `jaya_prelaunch_backup_...` databases are excluded.

```javascript
var backupsVerified = false;

function runReset(databaseName, execute = false, confirmName = "") {
  if (typeof execute !== "boolean") {
    throw new Error("execute must be true or false.");
  }

  // Retained MongoDB backup databases are deliberately excluded.
  if (
    databaseName !== "jaya" &&
    !/^jaya_reset_test_[0-9]{8}-[0-9]{6}$/.test(databaseName)
  ) {
    throw new Error("Database name is outside this reset procedure.");
  }

  if (!db.getMongo().getDBNames().includes(databaseName)) {
    throw new Error("Database not found: " + databaseName);
  }

  if (execute && confirmName !== databaseName) {
    throw new Error("Confirmation does not match. Nothing deleted.");
  }

  if (execute && !backupsVerified) {
    throw new Error("Verify the local and MongoDB backups before deleting.");
  }

  const rdb = db.getSiblingDB(databaseName);

  const fullyEmptied = [
    // Order-to-Billing workflow
    "orderpanels",
    "purchasepanels",
    "vehiclenegotiations",
    "advancepayments",
    "pricingpanels",
    "loadingpanels",
    "consignmentnotes",
    "pods",
    "balancepayments",
    "savedreports",

    // Linked trip and tracking history
    "drivertrips",
    "trackingsessions",
    "locationpoints",
    "tripevents",
    "stopepisodes",
    "mobileoperationalalerts",

    // Nine legacy workflow counter collections
    "orderpanelcounters",
    "purchasecounters",
    "vehiclenegotiationcounters",
    "advancepaymentcounters",
    "pricingcounters",
    "loadingcounters",
    "consignmentcounters",
    "podcounters",
    "balancepaymentcounters"
  ];

  const targets = fullyEmptied.map(name => ({
    name: name,
    filter: {}
  }));

  targets.push(
    {
      name: "reapprovalaudits",
      filter: {
        panel: {
          $in: [
            "order", "purchase", "vnn", "advance", "pricing",
            "loading", "lr", "pod", "balance"
          ]
        }
      }
    },
    {
      name: "documentsequences",
      filter: {
        documentType: {
          $in: [
            "OP", "ORD", "PUR", "VNN", "ADV",
            "PRC", "LD", "LR", "POD", "BLP"
          ]
        }
      }
    },
    {
      name: "counters",
      filter: {
        id: /^Billing-/
      }
    }
  );

  const existing = rdb.getCollectionNames();

  print("DATABASE: " + databaseName);
  print("MODE: " + (execute ? "DELETE" : "PREVIEW ONLY"));

  if (!execute) {
    print("ACTUAL COLLECTIONS:");
    printjson(existing.slice().sort());
  }

  // Read all counts before starting any deletion.
  for (const target of targets) {
    if (!existing.includes(target.name)) {
      print(target.name + ": ABSENT — verify this is expected");
      continue;
    }

    const count = rdb
      .getCollection(target.name)
      .countDocuments(target.filter);

    print(target.name + ": " + count + " selected");
  }

  if (!execute) {
    print("PREVIEW COMPLETE — nothing deleted.");
    return;
  }

  for (const target of targets) {
    if (!existing.includes(target.name)) {
      print(target.name + ": skipped; collection absent");
      continue;
    }

    const result = rdb
      .getCollection(target.name)
      .deleteMany(target.filter);

    print(target.name + ": deleted " + result.deletedCount);
  }

  for (const target of targets) {
    if (!existing.includes(target.name)) {
      continue;
    }

    const remaining = rdb
      .getCollection(target.name)
      .countDocuments(target.filter);

    print(target.name + ": remaining " + remaining);

    if (remaining !== 0) {
      throw new Error("Reset incomplete for " + target.name);
    }
  }

  print("RESET COMPLETE.");
}
```

If you exit mongosh and reconnect, paste the definition again. Variables and functions do not persist between sessions.

## 7. Preview the MAIN database reset

Inside mongosh:

```javascript
runReset("jaya", false);
```

Review the collection list and selected counts. An absent collection is expected only if that module never created its collection. If a module has data but its expected collection is absent, stop and investigate. There are no assumed record counts.

Current panel numbering uses `documentsequences.documentType`. Billing uses `counters.id` beginning with `Billing-`. The function also clears nine legacy workflow counter collections and historical matching document sequences, preventing old values from reseeding the series.

## 8. Reset the MAIN database

Proceed only after both backups are verified, the preview shows the intended scope, and every app/worker remains stopped. This permanently deletes selected workflow records across all companies in `jaya`.

Inside the same mongosh session:

```javascript
backupsVerified = true;
runReset("jaya", true, "jaya");
```

It must end with `RESET COMPLETE.` Then verify:

```javascript
runReset("jaya", false);
```

Every existing target collection/filter should show zero selected records. Absent collections remain absent. The deletion includes previously soft-deleted records and preserves indexes.

The reset runs collection by collection, not as one atomic transaction. If it fails, some records may already be deleted. Keep the app stopped and resolve the partial reset or recover from the verified backup before restarting.

## 9. Restart for the client

Exit mongosh:

```javascript
exit
```

- Confirm every app/worker points to `jaya`, not the backup or rehearsal database.
- Restart the app and workers.
- Avoid creating test entries in the main database if the client must receive the first numbers. Saves can consume numbers.
- The first panel entries should end in `0001`, per operating company and document type. The first generated general/product-wise/mosaic bill should end in `001`. Other bill types may use supplied numbers or timestamp defaults.
- Keep the local archive, manifest and retained MongoDB backup. Only the disposable rehearsal database can be removed after testing.

## What remains after the reset

Master data, users, driver profiles/devices, unrelated inventory/purchase-order/GRN/invoice/credit-note transactions, notification history, uploaded files, external accounting records and `_bak_` collections remain. Old notifications can therefore still appear.

Do not add unverified collection names such as `paneldrafts`, `driver_trips` or `driver_pings`, or empty the shared `notifications` collection without identifying their contents and scope.

## Recovery if something goes wrong

Keep writers stopped. The manifest identifies the original archive and retained MongoDB backup. First restore the archive into a **new recovery database name**, using the namespace-renaming pattern in step 3, and verify it. Then decide whether to switch to that recovered database or perform a controlled restore of affected collections.

Do not overwrite the original backup with a new dump of the emptied database. Do not restore over active client data or add `--drop` without a separate recovery decision; a full rollback can replace changes made after the backup.

## References

- [MongoDB: mongodump](https://www.mongodb.com/docs/database-tools/mongodump/)
- [MongoDB: mongorestore archive, namespace mapping and stopOnError](https://www.mongodb.com/docs/database-tools/mongorestore/)
- [Next.js: environment variable precedence](https://nextjs.org/docs/pages/guides/environment-variables)
