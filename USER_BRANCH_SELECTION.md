# User Branch Selection

Users → Add/Edit User → Branch access offers **All branches** or **Selected branches**. The user list shows the assignment. Existing users retain All branches when the setting is missing. Selected branches requires at least one active Branch belonging to the parent company. Branch masters are currently shared by its operating companies; operating-company access and branch access must both permit the transaction. Choosing a branch never grants another operating company.

Only Orders choose an owning branch. VNN, Pricing and Loading show their inherited branch as read-only. The server derives ownership through the saved sources rather than trusting downstream branch fields or pickup/delivery locations.

| Record | Ownership source |
| --- | --- |
| Order | Branch selected on the Order |
| VNN, rate target, placement | Every selected Order |
| Pricing | Referenced VNNs and Orders |
| Loading | VNN and its Order rows |
| Purchase | Loading/VNN and Orders |
| Advance payment | Purchase |
| LR | Loading/VNN and its actual Orders |
| POD | Purchase and linked LRs |
| Balance payment | POD/Purchase and Orders |
| Bill | Every included LR |
| Tracking | Trip → Loading and linked LRs |
| Reports, totals, reapproval workspace | Underlying scoped transactions |

Panel permissions still control actions. An Admin-role user with Selected branches remains restricted. Company accounts manage assignments. User assignments, activity and operating-company access are reloaded for each request; an old token cannot retain revoked branch access.

`withBranchAccess` establishes one AsyncLocalStorage scope per request. The model plugin protects reads, direct IDs, mutations, counts, distinct values, aggregates, joins, and document saves. Its graph loads ownership columns once per request and is isolated by parent company and selected operating company. Tracking history is filtered using trip IDs without scanning all location points. Workflow notifications use the same ownership checks. Responses use private/no-store caching.

New records combining multiple owning branches are rejected. Existing mixed-branch records require access to **every** included branch. Restricted users cannot access legacy records whose ownership cannot be resolved; All branches retains legacy access. No user assignment or approval status is migrated automatically. Newly saved records receive derived `owningBranchIds` and branch snapshots; access always resolves sources so changing a downstream snapshot cannot change access.

Run the read-only legacy audit before assigning restrictions:

```powershell
node scripts/audit-branch-ownership.mjs
# Optional: limit to one parent company
node scripts/audit-branch-ownership.mjs --company-id <ObjectId>
```

The audit reads `.env.local` using Next's environment loader and prints unresolved/mixed record counts and sample references. It never writes data. Repair unresolved source links as an administrator before expecting restricted users to see those records.

Shared masters stay shared, subject to existing master permissions. `/api/branches` returns assigned branches for user pickers; company administrators can see all branches for user administration. Driver-app token access retains its separate trip-assignment checks.

Verification: `node scripts/test-branch-access.mjs`, the existing payment/reapproval/LR regression scripts, and Next SWC compilation. Restart the server after deploying schema middleware changes; a running development process may still hold previously compiled Mongoose models.
