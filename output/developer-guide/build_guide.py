from docx import Document
from docx.shared import Inches, Pt, RGBColor
from pathlib import Path
out=Path('output/developer-guide');out.mkdir(parents=True,exist_ok=True)
d=Document();sec=d.sections[0];sec.top_margin=sec.bottom_margin=Inches(.7)
for name in ['Normal','Title','Heading 1','Heading 2']:
 st=d.styles[name];st.font.name='Calibri';st.font.color.rgb=RGBColor(0,0,0)
d.styles['Normal'].font.size=Pt(10)
d.styles['Normal'].paragraph_format.space_after=Pt(6)
def p(t):d.add_paragraph(t)
def h(t):d.add_heading(t,level=1)
def code(t):
 for line in t.split('\n'):
  q=d.add_paragraph();q.paragraph_format.space_after=Pt(1);r=q.add_run(line);r.font.name='Consolas';r.font.size=Pt(8)
d.add_heading('ERPNext integration for Jaya Logistics',0)
p('Developer setup guide | 16 November 2026')
p('Connect the existing logistics project to ERPNext for company-specific e-way bill generation and retrieval. The project already contains the calling endpoints and UI. The remaining work is to implement and deploy the ERPNext methods, configure credentials and mappings, and test the connection.')
h('1 Prepare the ERPNext environment')
p('Identify the ERPNext site name, hosting type and installed app versions. The commands below assume a standard Linux or WSL Bench installation. For Docker, include the custom app in your deployed image; for managed hosting, use its supported custom-app deployment process.')
code('cd ~/frappe-bench\nbench version\nbench --site YOUR_SITE list-apps')
p('Confirm whether India Compliance is installed and which e-way bill provider it uses. Inspect the installed version before choosing internal provider functions; this guide does not assume an undocumented India Compliance API.')
h('2 Create and install the custom app')
code('bench new-app jaya_integration\nbench --site YOUR_SITE install-app jaya_integration\nmkdir -p apps/jaya_integration/jaya_integration/api\ntouch apps/jaya_integration/jaya_integration/api/__init__.py')
p('Complete the new-app prompts. Create ewaybill.py inside that api directory. The full relative path is apps/jaya_integration/jaya_integration/api/ewaybill.py. Use a development or staging site first.')
code('import frappe\n\n@frappe.whitelist(methods=["POST"])\ndef generate(company, gstin, external_id, lr):\n    frappe.throw("Provider integration not implemented")\n\n@frappe.whitelist(methods=["POST"])\ndef fetch(company, gstin, external_id, ewaybill_no, lr=None):\n    frappe.throw("Provider integration not implemented")')
p('These are authenticated scaffolds only. Replace the placeholders with the provider integration before enabling live use. Never enable guest access.')
d.add_page_break()
h('3 Implement the ERPNext methods')
p('Generate must check the integration user permission, confirm that company and GSTIN belong together, select that GSTIN’s authorised credentials, validate the LR data and call the e-way bill provider. Persist external_id with the result and enforce uniqueness so a retry cannot generate a duplicate bill.')
p('Fetch must use the same company credential selection, retrieve the requested bill, compare invoice number, parties and vehicle against the LR, and report mismatches. Return success only after the verification you intend the UI to represent. The current logistics endpoint checks the returned bill number but does not perform those full comparisons itself.')
p('Both methods must return this application-level shape; Frappe wraps the returned object in its message field:')
code('return {\n    "ewaybillNo": "123456789012",\n    "expiryDate": "2026-11-20T23:59:00+05:30",\n    "pdfBase64": "<base64 encoded PDF bytes>"\n}')
p('The number and expiry are required by the logistics endpoint. The PDF is optional in its current contract but required for View PDF to work. Return raw base64, not a data URL. PDFs must be valid and no larger than 5 MB. If your provider returns only JSON, implement a PDF generation or retrieval step. Container number remains locally entered.')
p('Inputs already sent by the project: company, gstin, external_id, ewaybill_no, and lr containing lrNo, header, consignor, consignee, invoice metadata, container number and consignmentBreakdown. Invoice file bytes are not sent. Identify missing HSN, item, tax, pincode or other mandatory fields and extend the input/form contract before production. An uploaded invoice alone is not a complete generation payload.')
h('4 Configure each company and GSTIN')
p('For India Compliance, register the required GSP credentials for each applicable GSTIN and configure them under ERPNext GST Settings. Enable API access and complete provider account setup. A one-time portal registration may be needed; routine ERP operations can remain inside the logistics app.')
p('Fetch access is limited to an authorised supplier, recipient or transporter for that bill. It cannot retrieve an unrelated company’s bill simply from its number.')
p('Create an ERPNext integration user, assign only the necessary permissions and generate its API key and secret. These credentials connect your logistics server to ERPNext; company GSP credentials remain in ERPNext/provider configuration.')
h('5 Set the logistics server environment')
code('FRAPPE_URL=https://YOUR_ERPNEXT_HOST\nFRAPPE_API_KEY=<integration user API key>\nFRAPPE_API_SECRET=<integration user API secret>\nFRAPPE_EWAYBILL_GENERATE_METHOD=jaya_integration.api.ewaybill.generate\nFRAPPE_EWAYBILL_FETCH_METHOD=jaya_integration.api.ewaybill.fetch')
p('Keep these server-only. Do not use NEXT_PUBLIC variables or commit credentials. Restart or redeploy the logistics server after configuration changes.')
d.add_page_break()
h('6 Map local companies to ERPNext')
p('Set FRAPPE_OPERATING_COMPANY_MAP to JSON. Its keys must exactly match the local operating-company codes. Each ERPNext company name must exactly match its Company record, and the mapped GSTIN must match the local operating company legal profile.')
code('{\n  "YOUR_LOCAL_CODE": {\n    "erpnextCompany": "Exact ERPNext Company Name",\n    "gstin": "<actual matching GSTIN>",\n    "localSubCompanyId": "<local operating company Mongo ID>",\n    "enabled": false\n  }\n}')
p('This is a template, not a valid live configuration. Replace every placeholder. The current e-way bill route validates the statutory mapping but does not use enabled as a generation switch. Keep method configuration unset until staging passes; do not rely on enabled=false to prevent statutory calls.')
h('7 Test the complete connection')
for t in [
'1. Deploy the custom app through your hosting process. Confirm it appears in bench --site YOUR_SITE list-apps. Run site migration and restart services as required by that process.',
'2. Test the methods on an authorised sandbox or staging provider. Confirm authenticated POST calls to /api/method/jaya_integration.api.ewaybill.generate and the corresponding fetch path. Do not test generation by issuing an unplanned live bill.',
'3. In the logistics create page, select the operating company, fill the invoice and required statutory fields, upload the invoice and choose To Be Generated. Generate should save one draft LR, call ERPNext and attach the number, validity and PDF on the same screen.',
'4. For Provided by Customer, enter an accessible 12-digit bill number and choose Fetch & Verify. Confirm correct details and PDF; deliberately test a mismatched invoice and an inaccessible bill.',
'5. Repeat with a second company. Confirm ERPNext selects the second GSTIN’s credentials. Test mismatched GSTINs, missing configuration, permission failures and provider timeouts.',
'6. Verify retries do not create duplicate bills. Test generation success with PDF failure. Reconcile uncertain outcomes in ERPNext before retrying; the current UI does not provide Fetch under To Be Generated or a PDF upload fallback.',
'7. Run node scripts/test-ewaybill-documents.mjs and node scripts/test-ewaybill-create.mjs in the logistics project. These are offline tests; they do not prove the live integration works.'
]:p(t)
h('8 Release only after the pilot passes')
p('Back up configuration, deploy one operating company first, verify real authorised Generate and Fetch operations, then add other companies. Keep an audit trail of company, GSTIN, LR ID, provider reference and outcome without logging secrets. Define a reconciliation process for timeouts and missing PDFs before rollout.')
p('Official references\nhttps://docs.frappe.io/framework/user/en/tutorial/create-an-app\nhttps://docs.frappe.io/framework/user/en/basics/apps\nhttps://docs.indiacompliance.app/docs/ewaybill-and-einvoice/gst_settings\nhttps://docs.ewaybillgst.gov.in/apidocs/version1.02/get-eway-bill-details.html')
d.save(out/'ERPNext-integration-guide.docx')
