# Company-wise login and transaction scope

## Implemented configuration

The application retains its existing parent `Company` tenant. The three client-confirmed legal operating companies are represented as operating `SubCompany` records under that parent:

| Code | Name |
| --- | --- |
| JGL | Jaya Global Logistics |
| JL | Jaya Logistics |
| NK | Neelkanth |

They are created lazily and idempotently on the first Company or User sign-in. This avoids a production data migration merely to show the login selector.

## Session and access behaviour

- Company and User sign-in now require an operating-company selection. Customer sign-in is unchanged.
- The chosen company id, name, and code are signed into the JWT session.
- Existing users receive access to all three operating companies on their first sign-in, matching the confirmed shared-credentials requirement.
- User Management can restrict a user to selected companies, or deliberately grant all-company access. This makes a future policy change reversible without changing credentials or transaction data.
- The dashboard header displays the active operating company. Switching company is intentionally done by sign-out/sign-in, so there is no hidden context change while a form is open.

## Enforced transaction boundary

The server derives the company from the signed-in session and ignores form-supplied `subCompanyId`, name, and code for these operational routes:

- Order Panel
- Vehicle Negotiation, including Rate Target and Part 3
- Pricing Panel
- Loading Panel
- Purchase Panel
- Consignment Note
- Advance Payment
- Balance Payment

Every read, edit, approval, and delete on these routes is filtered to the active operating company. New records and embedded order rows are stamped with that same company.

## Legacy data policy

The confirmed current transactional data belongs to JGL. To avoid an irreversible immediate migration, records without `subCompanyId` remain visible only in a JGL session. JL and NK never receive those records.

When the client approves final data migration, update missing `subCompanyId`, `subCompanyName`, and `subCompanyCode` to JGL using a reviewed one-time database migration. The temporary JGL legacy fallback can then be disabled in `src/lib/companyScope.js` by passing `includeLegacyJgl: false` at the relevant route calls (or by changing its default).

## Intentionally deferred decisions

- Shared versus company-specific masters remains shared; no master records were duplicated or hidden.
- Legal-profile fields exist on `SubCompany` for future GST, address, bank, and document prefix details. PDFs and numbering are unchanged until the client supplies and approves those values.
- No combined group reporting is added.
- The existing VNN split remains unchanged: Part 1 and Part 3 remain in Vehicle Negotiation, while Part 2 remains the separately permissioned Rate Target workspace. Company scope is independent of those part permissions.

## Change inventory

- `src/models/SubCompany.js`: canonical model and legal profile fields.
- `src/models/CompanyUser.js`: configurable operating-company access fields.
- `src/lib/companyScope.js`: seed definitions, scope filter, and safe legacy fallback.
- Authentication, sign-in UI, session endpoint, user management, dashboard header, and the routes listed above: active-company selection and enforcement.
- `public/favicon.ico`: the existing favicon was moved from `src/app/favicon.ico` so Next.js does not generate a metadata route containing the apostrophe in the workspace path.
- `src/lib/auth.js`: fixed JWT serialization of the existing Mongoose `modules` map. This preserves current selected-module and action permissions in new user sessions; no database permissions were changed.
