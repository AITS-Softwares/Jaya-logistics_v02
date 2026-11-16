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
