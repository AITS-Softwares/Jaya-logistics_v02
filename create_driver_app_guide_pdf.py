from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfbase.pdfmetrics import stringWidth

OUT = "output/pdf/Jaya_Logistics_Driver_App_Quick_Guide.pdf"
PAGE_W, PAGE_H = A4

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="GuideTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=colors.HexColor("#111827"), spaceAfter=8))
styles.add(ParagraphStyle(name="GuideSub", parent=styles["Normal"], fontSize=11, leading=16, textColor=colors.HexColor("#4B5563"), spaceAfter=16))
styles.add(ParagraphStyle(name="H1Guide", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=colors.HexColor("#111827"), spaceBefore=12, spaceAfter=8))
styles.add(ParagraphStyle(name="H2Guide", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.HexColor("#111827"), spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyGuide", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=15, textColor=colors.HexColor("#1F2937"), spaceAfter=6))
styles.add(ParagraphStyle(name="SmallGuide", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=12, textColor=colors.HexColor("#4B5563"), spaceAfter=3))
styles.add(ParagraphStyle(name="FlowGuide", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.white, alignment=1))

def p(text, style="BodyGuide"):
    return Paragraph(text, styles[style])

def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet> {text}", styles["BodyGuide"])

def box(title, text, color="#FEF3C7"):
    t = Table([[Paragraph(f"<b>{title}</b><br/>{text}", styles["BodyGuide"])]], colWidths=[170*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), colors.HexColor(color)), ("BOX", (0,0), (-1,-1), 0.7, colors.HexColor("#D1D5DB")), ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10), ("TOPPADDING", (0,0), (-1,-1), 8), ("BOTTOMPADDING", (0,0), (-1,-1), 8)]))
    return t

def flow(labels):
    cells = [[Paragraph(x, styles["FlowGuide"]) for x in labels]]
    widths = [170*mm/len(labels)] * len(labels)
    t = Table(cells, colWidths=widths)
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#1F2937")), ("TEXTCOLOR", (0,0), (-1,-1), colors.white), ("ALIGN", (0,0), (-1,-1), "CENTER"), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("BOX", (0,0), (-1,-1), 0.5, colors.HexColor("#1F2937")), ("INNERGRID", (0,0), (-1,-1), 1, colors.HexColor("#FBBF24")), ("TOPPADDING", (0,0), (-1,-1), 10), ("BOTTOMPADDING", (0,0), (-1,-1), 10)]))
    return t

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont("Helvetica", 8); canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.drawString(20*mm, 12*mm, "Jaya Logistics Driver App - Quick Guide")
    canvas.drawRightString(PAGE_W-20*mm, 12*mm, f"Page {doc.page}")
    canvas.restoreState()

story = []
story += [p("Jaya Logistics Driver App", "GuideTitle"), p("Simple guide for dispatch staff and drivers", "GuideSub"), box("What this app does", "Drivers see only their assigned delivery trips. They can update trip status and share GPS location during an active trip. The normal ERP screens remain separate.", "#E0F2FE"), Spacer(1, 10)]
story += [p("Before you start", "H1Guide"), bullet("The ERP website must be running and reachable from the driver's phone."), bullet("The driver needs an Android phone, mobile data or Wi-Fi, and GPS enabled."), bullet("For real delivery use, the website must use HTTPS. The current HTTP APK is only for controlled testing."), bullet("The driver must receive a mobile number and PIN from dispatch."), Spacer(1, 8), p("Overall flow", "H2Guide"), flow(["Dispatch creates driver", "Dispatch assigns trip", "Driver signs in", "Dispatch approves phone", "Driver starts trip", "Tracking updates ERP"]), Spacer(1, 12), box("Important", "The APK connects to the server URL built into it. It uses the live server database, not the database on the developer's computer.", "#FEE2E2"), PageBreak()]

story += [p("Part 1  Dispatch Setup on the Website", "H1Guide"), p("Use a company admin account, or a user with Tracking Plan and Driver Mobile Settings permissions."), p("1. Enable mobile access", "H2Guide"), bullet("Open <b>Tracking Plan</b>, then open <b>Driver Mobile Setup</b>."), bullet("Open <b>Mobile Settings</b>."), bullet("Click <b>Generate strong secret</b>. Select <b>Pilot</b> for testing."), bullet("Add the test driver's mobile number, switch on <b>Enable driver mobile access</b>, and click <b>Save settings</b>."), p("2. Create the driver", "H2Guide"), bullet("In <b>Driver Mobile Setup</b>, enter driver name, the same mobile number used in Loading Info, and a PIN."), bullet("Click <b>Create driver</b>. Give the driver the PIN privately."), p("3. Assign a delivery", "H2Guide"), bullet("Select the existing Loading Info / vehicle."), bullet("Select the correct driver and click <b>Assign trip</b>."), box("Do not skip", "The mobile number in the driver account must match the driver mobile number recorded for the Loading Info.", "#FEF3C7"), PageBreak()]

story += [p("Part 2  Driver Installation and Login", "H1Guide"), p("1. Install the app", "H2Guide"), bullet("Receive the Jaya Logistics Driver APK from your company."), bullet("Open the APK on the Android phone and allow installation when Android asks."), bullet("Open <b>Jaya Logistics Driver</b>. Do not use the normal ERP website login."), p("2. Login", "H2Guide"), bullet("Enter your assigned mobile number and PIN."), bullet("After first login, the phone will show <b>waiting for dispatcher approval</b>."), p("3. Let dispatch approve the phone", "H2Guide"), bullet("Tell dispatch that you have logged in."), bullet("Dispatch opens Driver Mobile Setup and clicks <b>Approve</b> for your phone."), bullet("Tap <b>Refresh approval</b> in the app. Your assigned trip will appear."), p("4. Allow phone permissions", "H2Guide"), bullet("Allow <b>Precise Location</b> and <b>Notifications</b> when asked."), bullet("In Android App Settings, set Location to <b>Allow all the time</b> for delivery tracking."), bullet("Keep GPS and mobile data on. If needed, set battery use for the app to <b>Unrestricted</b> or turn off battery optimisation."), PageBreak()]

story += [p("Part 3  Driver Trip Steps", "H1Guide"), flow(["Open assigned trip", "Start trip", "Allow GPS", "Update trip steps", "Deliver and complete"]), p("During the delivery", "H2Guide"), bullet("Open the assigned trip and read the vehicle, pickup and destination details."), bullet("Tap the available action: <b>Start trip</b>, <b>At pickup</b>, <b>Start delivery</b>, <b>Arrived at stop</b>, or <b>Confirm delivery</b> as applicable."), bullet("When Start trip is used, the app starts location tracking. A tracking notification should remain visible."), bullet("Keep the phone charged, GPS on, and mobile data on until delivery is completed."), p("If something goes wrong", "H2Guide"), bullet("No assigned trip: ask dispatch to confirm the phone is approved and the trip is assigned."), bullet("Location not updating: turn on GPS and data, allow location all the time, then remove battery restriction."), bullet("Cannot login: check the mobile number and PIN with dispatch. For real use, confirm the server HTTPS address is available."), bullet("New phone: log in again from the new phone and ask dispatch to approve the new device. Dispatch should revoke the old phone."), box("Pilot test checklist", "Create one test driver - assign one test Loading Info - install APK - approve device - start trip - verify tracking appears in ERP - complete trip.", "#DCFCE7")]

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=20*mm)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
