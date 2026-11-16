# ERPNext integration for Jaya Logistics

Developer setup guide | 16 November 2026

Connect the existing logistics project to ERPNext for company-specific e-way bill generation and retrieval. The project already contains the calling endpoints and UI. The remaining work is to implement and deploy the ERPNext methods, configure credentials and mappings, and test the connection.

## 1 Prepare the ERPNext environment

Identify the ERPNext site name, hosting type and installed app versions. The commands below assume a standard Linux or WSL Bench installation. For Docker, include the custom app in your deployed image; for managed hosting, use its supported custom-app deployment process.

```bash
cd ~/frappe-bench
bench version
bench --site YOUR_SITE list-apps
```

Confirm whether India Compliance is installed and which e-way bill provider it uses. Inspect the installed version before choosing internal provider functions; this guide does not assume an undocumented India Compliance API.

## 2 Create and install the custom app

```bash
bench new-app jaya_integration
bench --site YOUR_SITE install-app jaya_integration
mkdir -p apps/jaya_integration/jaya_integration/api
touch apps/jaya_integration/jaya_integration/api/__init__.py
```

Complete the new-app prompts. Use a development or staging site first.

Copy the supplied Python starter files into the **ERPNext bench**, not the Next.js project:

```text
frappe-bench/
  apps/
    jaya_integration/
      jaya_integration/
        api/
          __init__.py
          ewaybill.py
```

The outer app directory is the repository; the inner `jaya_integration` directory is the Python package. The method path starts at that inner package.

Starter files accompanying this guide:

- [ewaybill.py](python-starter/jaya_integration/api/ewaybill.py)
- [__init__.py](python-starter/jaya_integration/api/__init__.py)
- [Server environment example](erpnext.env.example)

The Python package now contains implemented provider calls, not empty methods. It targets India Compliance's `EWaybillAPI.create(company_gstin=...)`, `generate_e_waybill(payload)` and `get_e_waybill(number)` interfaces. Your installed version is not yet known, so verify compatibility in staging before enabling live generation.

## 3 Install and prepare the implemented adapter

Copy `python-starter/jaya_integration/setup.py` into `apps/jaya_integration/jaya_integration/setup.py`, alongside the `api` package, then run through your supported Bench deployment:

```bash
bench --site YOUR_SITE execute jaya_integration.setup.install
```

This creates a non-accounting custom DocType called **Jaya Ewaybill Request** and a **Jaya Ewaybill Integration** role. It creates no Sales Invoice, Purchase Invoice, or accounting entry. Assign that role to the dedicated integration user, and grant the user access to the intended Company records. Run installation as Administrator/System Manager. On Frappe Cloud, confirm that your hosting setup supports deploying a custom app and running its installation helper; these files have not been installed on your site.

### Prepare the missing generation data

The logistics LR currently does not send all mandatory HSN, tax, item and structured address fields. For now, an authorised developer must prepare a complete, reviewed NIC generation payload in ERPNext before clicking Generate. This is an explicit integration prerequisite, not automatic invoice extraction.

Save the LR as a draft to obtain its Mongo record ID (not its displayed LR number). Prepare an NIC JSON file on the ERPNext server, then open the site's bench console:

```bash
bench --site YOUR_SITE console
```

```python
import json
from pathlib import Path
from jaya_integration.setup import prepare

payload = json.loads(Path("/absolute/path/reviewed-nic-payload.json").read_text())
request_name = prepare(
    company="Exact ERPNext Company Name",
    gstin="YOUR_ACTUAL_COMPANY_GSTIN",
    external_id="lr-ewaybill-<24 character saved LR Mongo ID>",
    payload=payload,
)
```

Do not run the example without replacing its placeholders. `prepare` stores a request only; it does not generate an e-way bill. The request contains NIC invoice, party, transport, item, HSN, tax and address data. Use the statutory schema applicable to your provider and installed version. Do not infer customer GSTINs, tax rates, pincodes or invoice values. The provider performs its statutory validation; the adapter also compares invoice number/date/value, party GSTINs and vehicle to the LR before generation.

To eliminate this manual preparation later, extend the logistics data model/form and payload mapping to supply these fields, or synchronise a reviewed non-accounting request to ERPNext. That project change is not included in these scripts.

### Implemented behaviour

- `generate` authenticates the integration user and validates company/GSTIN association using Company and linked Address records. It reads the prepared payload, locks the persistent request and calls India Compliance with that GSTIN's configured credentials.
- Successful requests are reused. Processing/uncertain requests cannot blindly generate again. A provider timeout is treated as uncertain and requires reconciliation. This relies on the custom request table being installed.
- Generation saves the bill number and validity before retrieval or PDF rendering. Missing PDFs do not erase statutory success.
- `fetch` retrieves an accessible bill directly by number, checks active status and validity, compares invoice number/date/value, consignor/consignee GSTINs and the latest provider vehicle entry against the LR, and returns a PDF where rendering succeeds. Unregistered-party scenarios with missing LR GSTINs fail closed and need explicit support before use.
- PDFs use India Compliance's e-Waybill Log print with the actual provider data. The print template and renderer must exist on your site. No fake PDF or number is returned.

Both endpoints return this shape, wrapped by Frappe in `message`:

```python
return {
    "ewaybillNo": bill_number,
    "expiryDate": validity_timestamp,
    "pdfBase64": pdf_as_base64,
}
```

The PDF key is omitted and `pdfPending` is true if PDF rendering fails. The logistics endpoint requires number and validity, and only enables View PDF once valid PDF bytes are saved. PDFs are limited to 5 MB. The current UI offers no upload fallback or Fetch under To Be Generated; provide a recovery operation before production. A cached Generate result does not retry PDF rendering. An authorised server-side Fetch can reconcile a generation request and recover the PDF.

## 4 Configure each company and GSTIN

For India Compliance, register the required GSP credentials for each applicable GSTIN and configure them under ERPNext GST Settings. Enable API access and complete provider account setup. A one-time portal registration may be needed; routine ERP operations can remain inside the logistics app.

Fetch access is limited to an authorised supplier, recipient or transporter for that bill. It cannot retrieve an unrelated company’s bill simply from its number.

Create an ERPNext integration user, assign only the necessary permissions and generate its API key and secret. These credentials connect your logistics server to ERPNext; company GSP credentials remain in ERPNext/provider configuration.

## 5 Set the logistics server environment

```ini
FRAPPE_URL=https://YOUR_ERPNEXT_HOST
FRAPPE_API_KEY=<integration user API key>
FRAPPE_API_SECRET=<integration user API secret>
FRAPPE_EWAYBILL_GENERATE_METHOD=jaya_integration.api.ewaybill.generate
FRAPPE_EWAYBILL_FETCH_METHOD=jaya_integration.api.ewaybill.fetch
```

These values are Python import paths, not credentials from the GST portal. They work only after the custom app and functions exist on ERPNext. The authenticated endpoints are:

```text
POST https://YOUR_ERPNEXT_HOST/api/method/jaya_integration.api.ewaybill.generate
POST https://YOUR_ERPNEXT_HOST/api/method/jaya_integration.api.ewaybill.fetch
```

The existing logistics server calls these endpoints using the integration user's API key and secret. It sends `company`, `gstin`, `external_id`, and `lr`; Fetch also receives `ewaybill_no`. Create no public guest endpoints. An authenticated function must still check the user's access to the requested company.

Keep these server-only. Do not use NEXT_PUBLIC variables or commit credentials. Restart or redeploy the logistics server after configuration changes.

## 6 Map local companies to ERPNext

Set FRAPPE_OPERATING_COMPANY_MAP to JSON. Its keys must exactly match the local operating-company codes. Each ERPNext company name must exactly match its Company record, and the mapped GSTIN must match the local operating company legal profile.

```json
{
  "YOUR_LOCAL_CODE": {
    "erpnextCompany": "Exact ERPNext Company Name",
    "gstin": "<actual matching GSTIN>",
    "localSubCompanyId": "<local operating company Mongo ID>",
    "enabled": false
  }
}
```

This is a template, not a valid live configuration. Replace every placeholder. The current e-way bill route validates the statutory mapping but does not use enabled as a generation switch. Keep method configuration unset until staging passes; do not rely on enabled=false to prevent statutory calls.

## 7 Test the complete connection

1. Deploy the custom app through your hosting process. Confirm it appears in bench --site YOUR_SITE list-apps. Run site migration and restart services as required by that process.

2. Test the methods on an authorised sandbox or staging provider. Confirm authenticated POST calls to /api/method/jaya_integration.api.ewaybill.generate and the corresponding fetch path. Do not test generation by issuing an unplanned live bill.

3. In the logistics create page, select the operating company, fill the invoice and required statutory fields, upload the invoice and choose To Be Generated. Generate should save one draft LR, call ERPNext and attach the number, validity and PDF on the same screen.

4. For Provided by Customer, enter an accessible 12-digit bill number and choose Fetch & Verify. Confirm correct details and PDF; deliberately test a mismatched invoice and an inaccessible bill.

5. Repeat with a second company. Confirm ERPNext selects the second GSTIN’s credentials. Test mismatched GSTINs, missing configuration, permission failures and provider timeouts.

6. Verify retries do not create duplicate bills. Test generation success with PDF failure. Reconcile uncertain outcomes in ERPNext before retrying; the current UI does not provide Fetch under To Be Generated or a PDF upload fallback.

7. Run node scripts/test-ewaybill-documents.mjs and node scripts/test-ewaybill-create.mjs in the logistics project. These are offline tests; they do not prove the live integration works.

## 8 Release only after the pilot passes

Back up configuration, deploy one operating company first, verify real authorised Generate and Fetch operations, then add other companies. Keep an audit trail of company, GSTIN, LR ID, provider reference and outcome without logging secrets. Define a reconciliation process for timeouts and missing PDFs before rollout.

Official references
https://docs.frappe.io/framework/user/en/tutorial/create-an-app
https://docs.frappe.io/framework/user/en/basics/apps
https://docs.indiacompliance.app/docs/ewaybill-and-einvoice/gst_settings
https://docs.ewaybillgst.gov.in/apidocs/version1.02/get-eway-bill-details.html

## 9 Included Python implementation

- [API implementation](python-starter/jaya_integration/api/ewaybill.py)
- [Installation and request preparation helper](python-starter/jaya_integration/setup.py)
- [API package initializer](python-starter/jaya_integration/api/__init__.py)
- [Offline behaviour tests](test_python_adapter.py)

### API source

```python
"""ERPNext adapter for Jaya Logistics, targeting India Compliance EWaybillAPI.

Requires setup.install() and a prepared Jaya Ewaybill Request for generation.
Uses no accounting invoice. Verify compatibility on the installed IC version.
"""
import base64
import hashlib
import json
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo

import frappe

DOCTYPE = "Jaya Ewaybill Request"
ROLE = "Jaya Ewaybill Integration"
IST = ZoneInfo("Asia/Kolkata")


def _object(value):
    value = frappe.parse_json(value) if isinstance(value, str) else value
    if not isinstance(value, dict):
        frappe.throw("Expected a JSON object.")
    return value


def _scope(company, gstin):
    if frappe.session.user == "Guest" or not set(frappe.get_roles()).intersection({ROLE, "System Manager"}):
        frappe.throw("E-way bill integration access required.", frappe.PermissionError)
    doc = frappe.get_doc("Company", company)
    doc.check_permission("read")
    gstin = str(gstin or "").strip().upper()
    if not re.fullmatch(r"[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[A-Z0-9]", gstin):
        frappe.throw("Invalid company GSTIN.")
    # Verify the GSTIN from authoritative Company/linked Address records.
    known = {str(doc.get("gstin") or "").strip().upper()}
    links = frappe.get_all("Dynamic Link", filters={"parenttype": "Address", "link_doctype": "Company", "link_name": company}, pluck="parent")
    for name in links:
        address = frappe.get_doc("Address", name)
        known.add(str(address.get("gstin") or "").strip().upper())
    if gstin not in known:
        frappe.throw("GSTIN does not belong to this ERPNext company.")
    return gstin


def _api(gstin):
    try:
        from india_compliance.gst_india.api_classes.nic.e_waybill import EWaybillAPI
    except ImportError:
        frappe.throw("Install a compatible India Compliance app on this site.")
    # This client selects configured GST credentials for the requested GSTIN.
    return EWaybillAPI.create(company_gstin=gstin)


def _name(company, gstin, external_id):
    if not isinstance(external_id, str) or not re.fullmatch(r"lr-ewaybill-[a-fA-F0-9]{24}", external_id):
        frappe.throw("Expected external_id lr-ewaybill-<24 character Mongo LR ID>.")
    return hashlib.sha256(f"{company}|{gstin}|{external_id}".encode()).hexdigest()


def _check_result(result):
    result = _object(result)
    if result.get("error_code") or result.get("errorCodes"):
        frappe.throw("Provider rejected the request. Inspect the restricted India Compliance API log.")
    return result


def _number(value):
    value = re.sub(r"\s", "", str(value or ""))
    if not re.fullmatch(r"[0-9]{12}", value):
        frappe.throw("E-way bill number must contain 12 digits.")
    return value


def _date(value):
    if not value:
        frappe.throw("Provider did not return a validity timestamp; Part A alone is not complete.")
    text = str(value).strip()
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        parsed = None
        for fmt in ("%d/%m/%Y %I:%M:%S %p", "%d/%m/%Y %I:%M %p", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y %H:%M"):
            try:
                parsed = datetime.strptime(text, fmt)
                break
            except ValueError:
                pass
        if parsed is None:
            frappe.throw("Unrecognised provider date format. Review the response before proceeding.")
    return parsed.replace(tzinfo=IST) if parsed.tzinfo is None else parsed.astimezone(IST)


def _match(details, lr, number):
    if _number(details.get("ewbNo") or details.get("ewayBillNo")) != number:
        frappe.throw("Provider returned a different e-way bill.")
    if str(details.get("status") or "").upper() != "ACT":
        frappe.throw("E-way bill is not active.")
    expiry = _date(details.get("validUpto"))
    if expiry <= datetime.now(IST):
        frappe.throw("E-way bill has expired.")
    _match_lr(details, lr)
    return expiry.isoformat()


def _match_lr(details, lr):
    invoice = lr.get("invoice") or {}
    comparisons = [("docNo", invoice.get("boeInvoiceNo"), "invoice number"),
                   ("fromGstin", (lr.get("consignor") or {}).get("gstNumber"), "consignor GSTIN"),
                   ("toGstin", (lr.get("consignee") or {}).get("gstNumber"), "consignee GSTIN")]
    for key, expected, label in comparisons:
        if not expected or str(details.get(key) or "").strip().upper() != str(expected).strip().upper():
            frappe.throw(f"Missing or mismatched {label}. Correct LR details before verification.")
    expected_date = str(invoice.get("boeInvoiceDate") or "").strip()
    actual_date = str(details.get("docDate") or "").strip()
    def parse_invoice_date(value):
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                pass
        frappe.throw("Invoice date is missing or has an unsupported format.")
    if parse_invoice_date(expected_date) != parse_invoice_date(actual_date):
        frappe.throw("Invoice date does not match the LR.")
    try:
        expected_value = Decimal(str(invoice.get("invoiceValue") or "").replace(",", ""))
        actual_value = Decimal(str(details.get("totInvValue") or ""))
        if not expected_value.is_finite() or not actual_value.is_finite() or abs(expected_value - actual_value) > Decimal("0.01"):
            frappe.throw("Invoice value does not match the LR.")
    except InvalidOperation:
        frappe.throw("A valid invoice value is required for verification.")
    vehicle = (lr.get("header") or {}).get("vehicleNo")
    vehicles = details.get("VehiclListDetails") or []
    if not vehicle or not vehicles:
        frappe.throw("LR vehicle and provider vehicle history are required for verification.")
    # NIC returns vehicle history; the first entry is the latest entry.
    actual = vehicles[0].get("vehicleNo")
    normalise = lambda v: re.sub(r"[^A-Z0-9]", "", str(v or "").upper())
    if normalise(vehicle) != normalise(actual):
        frappe.throw("Latest e-way bill vehicle does not match the LR.")


def _response(details, number, expiry):
    result = {"ewaybillNo": number, "expiryDate": expiry}
    try:
        # Render the India Compliance e-Waybill Log print, using real provider data.
        log = frappe.get_doc({"doctype": "e-Waybill Log", "name": number,
            "e_waybill_number": number, "data": frappe.as_json(details),
            "is_latest_data": 1, "is_cancelled": 0,
            "valid_upto": _date(expiry).replace(tzinfo=None)})
        pdf = frappe.get_print("e-Waybill Log", number, doc=log, no_letterhead=True, as_pdf=True)
        if not pdf.startswith(b"%PDF-") or len(pdf) > 5 * 1024 * 1024:
            raise ValueError("Invalid or oversized PDF")
        result["pdfBase64"] = base64.b64encode(pdf).decode("ascii")
    except Exception:
        # A print renderer failure must not discard the statutory bill number.
        result["pdfPending"] = True
    return result


@frappe.whitelist(methods=["POST"])
def generate(company, gstin, external_id, lr):
    gstin = _scope(company, gstin)
    lr = _object(lr)
    name = _name(company, gstin, external_id)
    if not frappe.db.exists(DOCTYPE, name):
        frappe.throw("Prepare this LR's Jaya Ewaybill Request in ERPNext first. Mandatory item, HSN, tax and address data are not yet supplied by the logistics form.")
    # Persistent row lock and committed Processing state prevent duplicate attempts.
    frappe.db.sql("SELECT name FROM `tabJaya Ewaybill Request` WHERE name=%s FOR UPDATE", name)
    request = frappe.get_doc(DOCTYPE, name)
    request.check_permission("write")
    if request.company != company or request.gstin != gstin or request.external_id != external_id:
        frappe.throw("Request company or LR association mismatch.")
    if request.state == "Complete":
        previous_payload = _object(request.payload_json)
        _match_lr({**previous_payload, "VehiclListDetails": [{"vehicleNo": previous_payload.get("vehicleNo")}]}, lr)
        return _object(request.result_json)
    if request.state in ("Processing", "Uncertain"):
        frappe.throw("Previous generation is processing or uncertain. Reconcile it before retrying.")
    payload = _object(request.payload_json)
    required = ("supplyType", "subSupplyType", "docType", "docNo", "docDate", "fromGstin", "toGstin", "fromPincode", "toPincode", "transDistance", "transMode", "vehicleNo", "itemList", "totInvValue")
    missing = [key for key in required if payload.get(key) in (None, "", [])]
    if missing:
        frappe.throw("Complete NIC payload fields: " + ", ".join(missing))
    # Run strict party/invoice/vehicle comparison before any statutory call.
    _match_lr({**payload, "VehiclListDetails": [{"vehicleNo": payload["vehicleNo"]}]}, lr)
    api = _api(gstin)  # Configuration errors happen before Processing is committed.
    request.state = "Processing"
    request.save()
    frappe.db.commit()
    try:
        generated = _check_result(api.generate_e_waybill(payload))
        number = _number(generated.get("ewayBillNo"))
        expiry = _date(generated.get("validUpto")).isoformat()
        # Record statutory success before retrieval or rendering, which can fail.
        request.state = "Complete"
        request.result_json = frappe.as_json({"ewaybillNo": number, "expiryDate": expiry})
        request.save()
        frappe.db.commit()
    except Exception:
        request.state = "Uncertain"
        request.save()
        frappe.db.commit()
        frappe.throw("Generation outcome is uncertain. Check the restricted provider log and reconcile; do not generate again blindly.")
    try:
        details = _check_result(api.get_e_waybill(number))
        _match(details, lr, number)
        result = _response(details, number, expiry)
    except Exception:
        result = {"ewaybillNo": number, "expiryDate": expiry, "pdfPending": True}
    request.result_json = frappe.as_json(result)
    request.save()
    return result


@frappe.whitelist(methods=["POST"])
def fetch(company, gstin, external_id, ewaybill_no, lr=None):
    gstin = _scope(company, gstin)
    name = _name(company, gstin, external_id)
    lr = _object(lr)
    number = _number(ewaybill_no)
    details = _check_result(_api(gstin).get_e_waybill(number))
    expiry = _match(details, lr, number)
    result = _response(details, number, expiry)
    if frappe.db.exists(DOCTYPE, name):
        request = frappe.get_doc(DOCTYPE, name)
        request.check_permission("write")
        if request.company != company or request.gstin != gstin:
            frappe.throw("Request company mismatch.")
        request.state = "Complete"
        request.result_json = frappe.as_json(result)
        request.save()
    return result
```

### Installation helper source

```python
"""One-time installation helpers; invoke through bench execute, not HTTP."""
import frappe


def install():
    frappe.only_for("System Manager")
    if not frappe.db.exists("Role", "Jaya Ewaybill Integration"):
        frappe.get_doc({"doctype": "Role", "role_name": "Jaya Ewaybill Integration"}).insert()
    if not frappe.db.exists("DocType", "Jaya Ewaybill Request"):
        fields = [
            {"fieldname": "request_key", "label": "Request Key", "fieldtype": "Data", "reqd": 1, "unique": 1, "read_only": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
            {"fieldname": "gstin", "label": "GSTIN", "fieldtype": "Data", "reqd": 1},
            {"fieldname": "external_id", "label": "LR External ID", "fieldtype": "Data", "reqd": 1},
            {"fieldname": "payload_json", "label": "NIC Generation Payload", "fieldtype": "Code", "options": "JSON", "reqd": 1},
            {"fieldname": "state", "label": "State", "fieldtype": "Select", "options": "Prepared\nProcessing\nUncertain\nComplete", "default": "Prepared", "read_only": 1},
            {"fieldname": "result_json", "label": "Result", "fieldtype": "Code", "options": "JSON", "read_only": 1},
        ]
        frappe.get_doc({"doctype": "DocType", "name": "Jaya Ewaybill Request", "module": "Jaya Integration", "custom": 1, "autoname": "field:request_key", "fields": fields,
            "permissions": [{"role": role, "read": 1, "write": 1, "create": 1} for role in ("System Manager", "Jaya Ewaybill Integration")]}).insert()
    frappe.db.commit()


def prepare(company, gstin, external_id, payload):
    """Create a request from reviewed NIC JSON. Does not generate a bill."""
    from jaya_integration.api.ewaybill import _scope, _name, _object
    gstin = _scope(company, gstin)
    key = _name(company, gstin, external_id)
    if frappe.db.exists("Jaya Ewaybill Request", key):
        frappe.throw("Request already exists. Review it rather than creating another.")
    doc = frappe.get_doc({"doctype": "Jaya Ewaybill Request", "request_key": key,
        "company": company, "gstin": gstin, "external_id": external_id,
        "payload_json": frappe.as_json(_object(payload)), "state": "Prepared"})
    doc.insert()
    frappe.db.commit()
    return doc.name
```

## 10 Deployment verification

After copying and reviewing the files, migrate and restart using your hosting's supported deployment process. Confirm the app and DocType exist and assign the integration role. Test both endpoints on the installed version with an authorised provider sandbox. Then enable the method environment variables on the logistics server and restart it.

```bash
bench --site YOUR_SITE migrate
bench --site YOUR_SITE list-apps
```

Offline checks can be run without ERPNext:

```bash
python test_python_adapter.py
```

Seven isolated tests cover unprepared data, company mismatch, generation success and cached retries, uncertain outcomes, Fetch mismatches and inactive bills, PDF failure retention, and Fetch success. They do not establish installed-version compatibility or live provider access.

Provider interface references inspected for implementation:

- https://github.com/resilient-tech/india-compliance/blob/develop/india_compliance/gst_india/api_classes/nic/e_waybill.py
- https://github.com/resilient-tech/india-compliance/blob/develop/india_compliance/gst_india/utils/e_waybill.py

No files have been deployed to your Frappe Cloud site and no statutory bills have been generated by this work.
