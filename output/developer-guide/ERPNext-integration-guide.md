# ERPNext e-way bill integration guide

Updated 17 November 2026. The custom app has now been implemented in the sibling repository **`D:/Work/jaya_integration_v01`**. Its [README](../../../jaya_integration_v01/README.md) is the detailed installation, file-editing and API reference. The [Next.js integration notes](../../EWAYBILL-INTEGRATION.md) describe the caller and recovery workflow.

## Where the code belongs

| Project | What lives there | Why |
|---|---|---|
| `jaya_integration_v01` | DocTypes, company mappings, Prepare/Preview/Generate/Fetch APIs, provider adapter, permissions and offline tests | ERPNext stores requests and accesses its configured GST credentials |
| `Jaya-logistics_v02` | Invoice extraction, review fields, draft LR save, preview confirmation and displayed result | Operators continue using the existing logistics workflow |

The transporter generates against the consignor's goods invoice; freight accounting is separate. There is no fixed company count. Each current or newly added operating company is onboarded through the same mapping/configuration process.

## Create or reuse the app

Your repository already contains the Frappe app scaffold and new implementation. Reuse it. The directory name is `jaya_integration_v01`, but the Python package/app name remains `jaya_integration`.

For reference, a new app would be created in a Linux/WSL development Bench with `bench new-app jaya_integration`. Do not run that again for this existing app.

Install this existing repository on a compatible development site:

```bash
cd ~/frappe-bench
bench get-app <YOUR_CUSTOM_APP_REPOSITORY_URL> --branch <YOUR_BRANCH>
bench --site YOUR_SITE install-app jaya_integration
bench --site YOUR_SITE migrate
```

For an already-installed app, deploy its updated code and migrate. For Frappe Cloud, connect this repository to the supported private bench/custom-app deployment process and install/update it on the intended site. Local files are not automatically deployed.

## DocTypes and files to edit

All definitions are standard app-owned DocTypes, committed in the custom app:

- `Jaya Ewaybill Request`: regular, non-accounting, non-submittable parent; stores the source LR, company, reviewed snapshot, goods, state and result.
- `Jaya Ewaybill Item`: goods child table with HSN, quantity, NIC unit, taxable value and tax rates.
- `Jaya Integration Company`: System Manager-controlled mapping of each source company ID/code to ERPNext Company and GSTIN, with a generation switch.

| Custom app path | Purpose |
|---|---|
| `jaya_integration/jaya_integration/doctype/` | Schema, field definitions and controllers |
| `jaya_integration/api/ewaybill.py` | Authenticated workflow and request state transitions |
| `jaya_integration/services/ewaybill_payload.py` | Reviewed field mapping, required fields, item/tax/total checks |
| `jaya_integration/services/ewaybill_provider.py` | India Compliance 15.31.4 client and print integration |
| `jaya_integration/services/request_write.py` | Prevent direct request payload/state editing |
| `jaya_integration/hooks.py`, `install.py` | App dependencies and integration role installation |
| `tests/test_ewaybill_offline.py` | Provider-free validation and workflow checks |

Do not edit ERPNext or India Compliance core files. For future schema authoring, use developer mode on a development site and select the Jaya Integration module with Custom unchecked, then commit the generated definitions. Deploy changes through app migration.

The obsolete Python starter, its tests and the old Word-generation script have been removed from the Next.js project. The Frappe source and tests now live only in `jaya_integration_v01`. Do not install an old `setup.install()` prototype alongside the app-owned DocType of the same name; an existing prototype installation requires a data-preserving migration. The older Word copy is not synchronized with this Markdown guide.

## Configure any number of companies

For every operating company added by an admin:

1. Complete its Next.js legal profile.
2. Create/verify its ERPNext Company and GST-bearing linked Address.
3. Add authorised GSP credentials in GST Settings and finish India Compliance API configuration.
4. Create its `Jaya Integration Company` mapping using the exact source Mongo ID and code.
5. Add its explicit `FRAPPE_OPERATING_COMPANY_MAP` entry in Next.js server configuration.
6. Grant the dedicated integration user Company access.
7. Verify configuration before enabling generation for that company.

The admin's creation of a Next.js subcompany does not automatically create ERPNext companies, GST credentials or environment mappings. No company may silently use another company's mapping. The company saved on the LR controls generation even if the operator changes their active company.

## Configure the Next.js server

Use [the placeholder environment example](erpnext.env.example). Required methods are:

```ini
FRAPPE_EWAYBILL_PREVIEW_METHOD=jaya_integration.api.ewaybill.preview
FRAPPE_EWAYBILL_GENERATE_METHOD=jaya_integration.api.ewaybill.generate
FRAPPE_EWAYBILL_FETCH_METHOD=jaya_integration.api.ewaybill.fetch
FRAPPE_EWAYBILL_ENABLED=false
```

Also configure FRAPPE_URL, FRAPPE_API_KEY, FRAPPE_API_SECRET and the company map. Never use NEXT_PUBLIC variables for credentials. Restart/redeploy after environment changes. Generation requires the global flag, Next.js company entry and Frappe company mapping to be enabled. All remain unconfigured/disabled until deliberately enabled; no live credentials were changed by implementation.

## Operator workflow and recovery

Save draft -> complete/review invoice, parties, physical addresses, goods, taxes and transport -> preview -> explicitly confirm generation -> save result on the same LR. Create Draft & Continue saves a draft and opens its Edit page. ERPNext action buttons are available only on the saved LR. Save corrections before preview/fetch, and submit the draft for approval when ready.

Prepare/Preview persists and validates the request without contacting the provider. Missing required data blocks Generate. A confirmed prepared version must still match the saved LR when generation occurs.

Use Fetch for an existing customer-provided bill or to recover an issued bill/PDF. A timed-out generation is Uncertain and cannot be blindly retried. Reconcile through the restricted provider log and Fetch the actual number. Stale Processing can be fetched after two minutes. Source invoice/party/goods/vehicle edits are blocked after an issued or uncertain result.

First-release support is domestic road supply against goods invoices with transaction types 1-4, explicit URP if applicable, and Part B vehicle/validity. Other movements and statutory amendments require extensions. Original invoice bytes are not transferred to Frappe; the reviewed fields are.

## Verification before enabling live generation

Public source compatibility was checked against India Compliance 15.31.4 and the Frappe 15.120.1 print implementation. ERPNext target is 15.121.2. Offline tests passed during development, but no Frappe site migration, provider authentication, live fetch/generation or real PDF rendering has been tested.

On deployment, verify schema installation, role/company permissions, an additional admin-added company, concurrent requests, stale confirmations, timeout reconciliation and PDF recovery. Then run an authorised live Fetch and a planned generation. Start with one company and onboard additional companies through the same process.

Official references: [Create app](https://docs.frappe.io/framework/user/en/tutorial/create-an-app), [Create DocType](https://docs.frappe.io/framework/user/en/tutorial/create-a-doctype), [Frappe Cloud custom app](https://docs.frappe.io/cloud/benches/custom-app), [India Compliance setup](https://docs.indiacompliance.app/docs/ewaybill-and-einvoice/gst_settings).
