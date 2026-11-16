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
