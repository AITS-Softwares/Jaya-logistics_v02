from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

OUT = Path(r"output/pdf/Jaya_Logistics_API_Setup_Guide.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

BLUE = colors.HexColor('#17365D')
TEAL = colors.HexColor('#0E7490')
LIGHT = colors.HexColor('#EAF3F8')
GREEN = colors.HexColor('#DCFCE7')
AMBER = colors.HexColor('#FEF3C7')
GREY = colors.HexColor('#475569')

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCustom', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=25, leading=30, textColor=BLUE, alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle(name='SubTitle', parent=styles['Normal'], fontName='Helvetica', fontSize=11, leading=15, textColor=GREY, alignment=TA_CENTER, spaceAfter=16))
styles.add(ParagraphStyle(name='H1Custom', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=BLUE, spaceBefore=12, spaceAfter=8))
styles.add(ParagraphStyle(name='H2Custom', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=TEAL, spaceBefore=9, spaceAfter=5))
styles.add(ParagraphStyle(name='BodyCustom', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.5, leading=14, textColor=colors.HexColor('#1F2937'), spaceAfter=5))
styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.2, leading=11, textColor=GREY, spaceAfter=3))
styles.add(ParagraphStyle(name='TableHead', parent=styles['BodyText'], fontName='Helvetica-Bold', fontSize=8.2, leading=11, textColor=colors.white, spaceAfter=3))
styles.add(ParagraphStyle(name='Step', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.5, leading=14, leftIndent=6, firstLineIndent=-6, textColor=colors.HexColor('#1F2937'), spaceAfter=4))

def p(text, style='BodyCustom'):
    return Paragraph(text, styles[style])

def bullets(items):
    return [p(f'• {x}', 'Step') for x in items]

def table(rows, widths, header=True):
    converted = [[p(cell, 'TableHead' if r == 0 and header else 'Small') for cell in row] for r, row in enumerate(rows)]
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign='LEFT')
    ts = [('VALIGN',(0,0),(-1,-1),'TOP'), ('GRID',(0,0),(-1,-1),0.35,colors.HexColor('#CBD5E1')), ('LEFTPADDING',(0,0),(-1,-1),7), ('RIGHTPADDING',(0,0),(-1,-1),7), ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6)]
    if header:
        ts += [('BACKGROUND',(0,0),(-1,0),BLUE), ('TEXTCOLOR',(0,0),(-1,0),colors.white)]
    for r in range(1 if header else 0, len(rows)):
        if r % 2 == 0: ts.append(('BACKGROUND',(0,r),(-1,r),colors.HexColor('#F8FAFC')))
    t.setStyle(TableStyle(ts))
    return t

def box(title, content, color=LIGHT):
    t = Table([[p(f'<b>{title}</b><br/>{content}', 'BodyCustom')]], colWidths=[170*mm])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),color),('BOX',(0,0),(-1,-1),0.5,colors.HexColor('#94A3B8')),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#CBD5E1')); canvas.line(20*mm, 14*mm, 190*mm, 14*mm)
    canvas.setFont('Helvetica', 8); canvas.setFillColor(GREY)
    canvas.drawString(20*mm, 9*mm, 'Jaya Logistics - API Setup Guide')
    canvas.drawRightString(190*mm, 9*mm, f'Page {doc.page}')
    canvas.restoreState()

story = []
story += [Spacer(1, 14*mm), p('Jaya Logistics', 'TitleCustom'), p('Junior Team Guide: Create and Hand Over the Required Paid APIs', 'SubTitle')]
story.append(box('Read this first', 'Your job is to create company-owned accounts, add billing only after management approval, and collect the correct access details for the developer. Do not send API keys, passwords, OTPs, card details, or credential files in GitHub, WhatsApp, or normal chat.', AMBER))
story += [Spacer(1,8), p('The simple plan', 'H1Custom')]
story.append(table([
    ['Feature', 'Service to use', 'What it gives us'],
    ['PIN code and address lookup', 'Google Maps Geocoding API', 'Reliable PIN code/address lookup and coordinates for maps.'],
    ['Live driver / vehicle tracking', 'Mappls InTouch Enterprise', 'Live GPS device data, trips, geofences, alerts and fleet tracking.'],
    ['Document reading and mapping', 'Google Cloud Document AI', 'Reads PDFs/images and returns useful fields such as invoice number, totals and line items.'],
], [43*mm, 49*mm, 78*mm]))
story += [Spacer(1,7), p('Do these tasks in this order', 'H2Custom')] + bullets([
    '<b>1.</b> Create one Google Cloud billing account. It covers both PIN code lookup and document reading.',
    '<b>2.</b> Set a monthly budget and alerts before switching on any production API.',
    '<b>3.</b> Create the Google Maps Geocoding API key.',
    '<b>4.</b> Create the two Google Document AI processors.',
    '<b>5.</b> Ask Mappls for a written Enterprise quotation. Pay only after it is approved.',
    '<b>6.</b> Share access with the developer only through a password manager or secure secret-sharing method.'
])
story.append(PageBreak())

story += [p('1. PIN code and address lookup', 'H1Custom'), p('Chosen service: Google Maps Geocoding API', 'H2Custom'), p('Use this instead of the public India Post API. The current project calls India Post directly, which can be slow or unavailable. Google provides a paid production service with India-based billing and a published price list.', 'BodyCustom')]
story.append(box('What this API does', 'It accepts a PIN code or address and returns location information and map coordinates. Our backend will keep the same simple result used by the existing forms: PIN code, city, district, state and country.', GREEN))
story += [p('Create the account and API key', 'H2Custom')] + bullets([
    'Open <link href="https://console.cloud.google.com/">console.cloud.google.com</link> and sign in using the company Google account.',
    'Create a new project named <b>jaya-logistics-production</b>. Do not use a personal project.',
    'Open <b>Billing</b>, add the company card and create a monthly budget alert. Start with an alert at 50%, 80% and 100%.',
    'Open <b>APIs &amp; Services &gt; Library</b> and enable <b>Geocoding API</b>.',
    'Open <b>Credentials &gt; Create credentials &gt; API key</b>. Name it <b>Jaya server geocoding production</b>.',
    'Restrict the key to the Geocoding API and to the production server. The key must be used only by our backend - never directly in a browser page.',
    'Give the developer the key securely. The developer will add it as a server environment variable, not hard-code it.'
])
story += [p('Cost in plain language', 'H2Custom'), p('For eligible India customers, Geocoding includes 70,000 free monthly requests. Above that, the published price is USD 1.50 per 1,000 requests for the first large usage tier, converted to INR on billing. This means normal form usage should remain inexpensive. Always check the live Google India price page before payment because prices can change.', 'BodyCustom')]
story.append(box('Important developer note', 'The existing server route is <b>src/app/api/pincode-lookup/route.js</b>. Replace only its external provider call; keep its response fields unchanged so all existing forms continue to work.', LIGHT))
story.append(PageBreak())

story += [p('2. Live driver and vehicle tracking', 'H1Custom'), p('Chosen service: Mappls InTouch Enterprise', 'H2Custom'), p('Mappls is an India-focused mapping and telematics provider. It is suitable for live fleet tracking where vehicles use GPS tracking hardware/devices. It provides more than a map: it can supply live locations, trip history, geofences and alerts.', 'BodyCustom')]
story.append(box('Very important difference', '<b>A map does not track a vehicle by itself.</b> We need a source of GPS data. Mappls InTouch is ideal when a vehicle has compatible GPS hardware. If drivers will use only their Android phones, we instead need to build a background GPS feature in the driver mobile app; a browser page cannot reliably track while a phone is locked.', AMBER))
story += [p('Get a quote and create the account', 'H2Custom')] + bullets([
    'Open <link href="https://about.mappls.com/api/mobility-and-tracking/">Mappls InTouch - Mobility and Tracking</link>. Use <b>Contact us</b> for an Enterprise quotation.',
    'Send this requirement: “We need live fleet tracking API for Jaya Logistics, including REST/webhook access, live location, trip history, geofences, alerts, and a web dashboard.”',
    'Tell them the planned vehicle count, expected location update frequency, cities/India coverage, and whether GPS hardware already exists.',
    'Ask Mappls to confirm supported hardware/device models. Do not buy devices until compatibility is confirmed in writing.',
    'Ask for the quote in INR, including GST, setup/onboarding fee, monthly or annual minimum, per-device/event charge, data retention, support level, SLA and cancellation terms.',
    'After approval and payment, request the licence key, API documentation, sandbox access, production access and webhook/IP allow-list instructions.',
    'Store the licence key in the password manager and share it securely with the developer.'
])
story += [p('What the developer will build after access is received', 'H2Custom')]
story.append(table([
    ['Part', 'Work'],
    ['Internal data', 'Create Driver, Trip and LocationPing records in MongoDB.'],
    ['Provider bridge', 'Call Mappls securely from server routes; never expose the licence key in the browser.'],
    ['Admin dashboard', 'Show drivers, moving/stopped/offline status, last update, speed, route and assigned order on the existing Leaflet map.'],
    ['Alerts', 'Create geofence, offline and delayed-trip notifications after confirming the business rules.'],
], [45*mm, 125*mm]))
story.append(PageBreak())

story += [p('3. Reading uploaded documents (OCR)', 'H1Custom'), p('Chosen service: Google Cloud Document AI', 'H2Custom'), p('OCR means reading text from a photo or PDF. Document AI does more: it can return named fields and line items. This is much better than basic OCR, which returns a large block of text that our code then has to guess how to understand.', 'BodyCustom')]
story.append(box('Use two processors', '<b>Invoice Parser:</b> for invoices; it returns invoice number, supplier, amounts, tax, dates and line items. <br/><b>Custom Extractor:</b> for Indian driving licence, RC, insurance, PUC and POD documents; we define the exact fields we need and test the results on real sample documents.', GREEN))
story += [p('Create Document AI processors', 'H2Custom')] + bullets([
    'Use the same company Google Cloud billing account created for Maps.',
    'Open <link href="https://console.cloud.google.com/ai/document-ai/processors">Document AI Processor Gallery</link>. Enable <b>Document AI API</b> if asked.',
    'Create an <b>Invoice Parser</b> processor named <b>Jaya invoice parser production</b>. Save its Processor ID and selected location.',
    'Create a <b>Custom Extractor</b> named <b>Jaya transport document reader production</b>.',
    'Define fields such as driver name, driving licence number, expiry date, vehicle number, RC number, insurer, policy number, insurance expiry, PUC expiry and POD reference.',
    'Prepare clean sample documents with sensitive personal details hidden or safely handled. Label and test enough representative samples before production use.',
    'Create a dedicated <b>service account</b> with only the required Document AI permissions. This is different from a Maps API key.',
    'Give the developer the Processor IDs, selected location and service-account access through a secure channel. Do not send a credential JSON file over WhatsApp/email.'
])
story += [p('Cost and quality controls', 'H2Custom'), p('Published pricing is per processed page: Enterprise Document OCR is USD 1.50 per 1,000 pages, while Form Parser/Custom Extractor is USD 30 per 1,000 pages. Use the more expensive structured processor only when fields must be mapped. For every document, show the extracted result to a user for confirmation - especially expiry dates, licence numbers, invoice totals and vehicle numbers.', 'BodyCustom')]
story.append(box('Important project note', 'The project currently has a route called <b>src/app/api/extract-items/route.js</b> that receives text after OCR. The new secure server route should upload/process the actual PDF or image with Document AI, normalize the response to Jaya fields, retain confidence scores, and ask for user review when confidence is low.', LIGHT))
story.append(PageBreak())

story += [p('Security checklist - must follow', 'H1Custom')] + bullets([
    'Use a company-owned Google account and company billing profile, not a developer personal account.',
    'Turn on two-factor authentication for all administrator accounts.',
    'Create at least two Google Cloud Project Owners and Billing Administrators so one person is never a single point of failure.',
    'Create monthly budgets and 50%, 80%, 100% alerts before enabling production traffic.',
    'Restrict every key. Limit each API key to its service and server/referrer; restrict service-account permissions to the smallest required set.',
    'Never commit .env files, keys, or credential JSON files to Git. Add them to the deployment platform secret manager.',
    'Keep separate test and production credentials. Test with sample data before pointing the live application to production.',
    'Keep document uploads private. Define retention and deletion rules because licences, RCs and invoices contain sensitive business and personal data.',
    'Do not rely solely on OCR output for legal/financial decisions. Require human confirmation for low-confidence fields.'
])
story += [p('Handover checklist for the developer', 'H2Custom')]
story.append(table([
    ['Item', 'What to provide'],
    ['Google Maps', 'Restricted server API key, billing project ID, and confirmation that Geocoding API is enabled.'],
    ['Google Document AI', 'Google Cloud project ID, processor IDs, processor location and secure service-account access.'],
    ['Mappls', 'Signed quote/plan details, licence key, API documentation, device compatibility confirmation and sandbox/production endpoints.'],
    ['Business rules', 'Fields required for each document, acceptance confidence threshold, manual-review owner, alert rules and data-retention period.'],
], [45*mm, 125*mm]))
story += [Spacer(1,8), p('Official links', 'H2Custom')] + bullets([
    '<link href="https://console.cloud.google.com/">Google Cloud Console</link>',
    '<link href="https://developers.google.com/maps/billing-and-pricing/pricing-india">Google Maps India pricing</link>',
    '<link href="https://cloud.google.com/document-ai/docs/setup">Document AI setup guide</link>',
    '<link href="https://cloud.google.com/products/document-ai/pricing">Document AI pricing</link>',
    '<link href="https://about.mappls.com/api/mobility-and-tracking/">Mappls InTouch tracking product page</link>'
])
story.append(box('Before any credit-card payment', 'Confirm the legal company name, GST details, billing contact, monthly spending cap, cancellation terms and whether prices include GST. Save invoices and plan documents in the company records.', AMBER))

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=15*mm, bottomMargin=20*mm, title='Jaya Logistics API Setup Guide')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
