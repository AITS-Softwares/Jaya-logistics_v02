import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "D:/NIKHIL'S WORKSPACE/JAYA LOGISTICS/Jaya-logistics_v02/outputs/company-login-questionnaire";
const outputPath = `${outputDir}/Company_Login_and_VNN_Workflow_Questionnaire.xlsx`;

const workbook = Workbook.create();
const questionnaire = workbook.worksheets.add("Client Questionnaire");
const guide = workbook.worksheets.add("Plain-English Guide");

const navy = "#17365D";
const blue = "#1F4E78";
const lightBlue = "#D9EAF7";
const paleBlue = "#EEF5FB";
const paleYellow = "#FFF2CC";
const paleGreen = "#E2F0D9";
const grey = "#F2F2F2";
const border = "#C9D7E3";
const white = "#FFFFFF";

questionnaire.showGridLines = false;
questionnaire.mergeCells("A1:E1");
questionnaire.getRange("A1").values = [["Jaya Logistics – Company Login & Vehicle Negotiation Questionnaire"]];
questionnaire.getRange("A1:E1").format = {
  fill: navy,
  font: { bold: true, color: white, size: 16 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
questionnaire.getRange("A1:E1").format.rowHeight = 30;

questionnaire.mergeCells("A2:E2");
questionnaire.getRange("A2").values = [["Purpose: Please answer each question in Column E. These answers will define the company-wise login, data visibility, and the updated Vehicle Negotiation workflow."]];
questionnaire.getRange("A2:E2").format = {
  fill: lightBlue,
  font: { italic: true, color: "#1D3557", size: 10 },
  wrapText: true,
  verticalAlignment: "center",
};
questionnaire.getRange("A2:E2").format.rowHeight = 36;

questionnaire.mergeCells("A3:E3");
questionnaire.getRange("A3").values = [["How to respond: Enter the client/team answer in the yellow cell beside each question. Use the Notes column only as background; it does not need an answer."]];
questionnaire.getRange("A3:E3").format = {
  fill: paleGreen,
  font: { color: "#375623", size: 10 },
  wrapText: true,
  verticalAlignment: "center",
};
questionnaire.getRange("A3:E3").format.rowHeight = 30;

const headers = [["No.", "Topic", "Question for Client / Team", "Why this is needed", "Client / Team Answer"]];
questionnaire.getRange("A5:E5").values = headers;
questionnaire.getRange("A5:E5").format = {
  fill: blue,
  font: { bold: true, color: white, size: 10 },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: border },
};
questionnaire.getRange("A5:E5").format.rowHeight = 34;

const questions = [
  [1, "Company list", "Please confirm the exact list of operating companies / account books. We currently have: Jaya Global Logistics, Jaya Logistics, Neelkanth, and one fourth name that is not yet confirmed.", "We need a final, unambiguous list for the login dropdown and database setup.", ""],
  [2, "Meaning", "For each listed name, is it a separate legal company, a separate accounting book, a branch/division, or another business unit? Please state the correct type for each.", "This decides which information must be separated: only transactions, or also GST, invoices, ledgers and numbering.", ""],
  [3, "Login choice", "Should internal users select an operating company / account book on every login, in addition to email and password?", "Confirms the required login-page behavior.", ""],
  [4, "User access", "Can one employee access more than one operating company? If yes, please provide the user/role-wise company access rules.", "The system must prevent a valid user from selecting a company they are not authorized to access.", ""],
  [5, "Admin access", "Should Company Admin / Super Admin see all operating companies? Should they be able to change the active company after login without logging out?", "Defines admin visibility and whether a secure Switch Company feature is needed.", ""],
  [6, "Data separation", "Which data must be separate company-wise: Orders, Vehicle Negotiation, Pricing, Loading, Purchase, Consignment Notes, POD, Advance/Balance Payments, invoices, billing, reports, and finance? Please confirm any exceptions.", "Every listed module will be filtered by the selected company unless explicitly shared.", ""],
  [7, "Shared masters", "For each master below, should it be shared across all companies or separate per company: Customers, Suppliers, Vehicles, Branches, Plants, Price Lists, Payment Terms, Purchase Types, Items?", "A shared master can be reused; a separate master must only appear in its own company’s forms.", ""],
  [8, "Document numbering", "Should document numbers restart separately for each company/account book, or continue as one common sequence? Please answer for Order, VNN, Pricing, Loading, Purchase, CN, invoice and payment numbers.", "For example, a separate sequence can create JLG-VNN-0001 and NK-VNN-0001. A common sequence would create VNN-0001, VNN-0002 across all companies. This changes reports, printing and audit trails.", ""],
  [9, "Existing records", "All existing records currently belong to which operating company/account book? If some belong to different companies, please provide a mapping or confirm who will assign them.", "Historical data needs a safe one-time allocation before company-wise filtering is activated.", ""],
  [10, "Customer login", "Should the company selection apply to Customer login too, or only to internal Company/User logins?", "Customer access may need different rules from employee access.", ""],
  [11, "Company-specific documents", "Do companies have different GST details, legal names, addresses, bank details, invoice/PDF templates or email identities? If yes, please list what differs by company.", "These details must be selected from the active company in printed and emailed documents.", ""],
  [12, "Vehicle Negotiation – Part 1", "Who may create/edit Part 1 (Vehicle Negotiation Panel)? When they submit it, should it be permanently locked until an authorized amendment is opened? Who may request/open that amendment?", "The current flow already supports Part 1 lock and an amendment audit trail; roles and rules must be confirmed.", ""],
  [13, "Vehicle Negotiation – Rate Target", "Who may edit the separate Rate Target workspace (Part 2)? Who may approve or reject it? On rejection, may the same user edit and resubmit it, or must Part 1 be amended first?", "Part 2 has recently moved out of the main VNN form into its own queue/workspace and begins after Part 1 is locked.", ""],
  [14, "Vehicle Negotiation – Part 3", "Who may enter vehicle/supplier/final-rate details in Part 3? Who may approve/reject Part 3 and the memo? Should Part 3 remain locked until Part 2 is approved?", "This controls the final placement stage and prevents premature vehicle allocation.", ""],
  [15, "VNN across companies", "Can one Vehicle Negotiation use orders, suppliers, vehicles or data from more than one operating company?", "Recommended answer: No. A VNN and all connected records should stay within one selected company to keep accounting and reporting correct.", ""],
  [16, "Role matrix", "Please provide the final role-to-action matrix for each VNN stage: view, create/edit, submit/lock, amend, approve, reject, upload memo and final edit.", "Existing module permissions are general. The updated workflow needs stage-specific roles and actions.", ""],
  [17, "Reporting", "Should group administrators have a combined report across all companies, while normal users see only their selected company’s report?", "Defines whether a group-level consolidated report is in scope.", ""],
  [18, "Go-live approval", "Who will approve the final user-company mapping, master-data rules and historical-record mapping before company-wise filtering goes live?", "A named approver is needed to avoid incorrectly hiding or allocating existing records.", ""],
];

questionnaire.getRange(`A6:E${5 + questions.length}`).values = questions;
const dataRange = questionnaire.getRange(`A6:E${5 + questions.length}`);
dataRange.format = {
  verticalAlignment: "top",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: border },
  font: { size: 10, color: "#1F2937" },
};
questionnaire.getRange(`A6:A${5 + questions.length}`).format = { horizontalAlignment: "center", verticalAlignment: "top", borders: { preset: "all", style: "thin", color: border } };
questionnaire.getRange(`B6:B${5 + questions.length}`).format = { fill: paleBlue, font: { bold: true, size: 10, color: "#1D4E89" }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: border } };
questionnaire.getRange(`D6:D${5 + questions.length}`).format = { fill: grey, font: { italic: true, size: 9, color: "#4B5563" }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: border } };
questionnaire.getRange(`E6:E${5 + questions.length}`).format = { fill: paleYellow, font: { size: 10, color: "#1F2937" }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: border } };
for (let row = 6; row <= 5 + questions.length; row += 1) {
  questionnaire.getRange(`A${row}:E${row}`).format.rowHeight = 62;
}
questionnaire.getRange("A:A").format.columnWidth = 7;
questionnaire.getRange("B:B").format.columnWidth = 20;
questionnaire.getRange("C:C").format.columnWidth = 54;
questionnaire.getRange("D:D").format.columnWidth = 44;
questionnaire.getRange("E:E").format.columnWidth = 52;
questionnaire.freezePanes.freezeRows(5);
questionnaire.getRange(`E6:E${5 + questions.length}`).dataValidation = { rule: { type: "custom", formula1: "TRUE" } };

guide.showGridLines = false;
guide.mergeCells("A1:D1");
guide.getRange("A1").values = [["Plain-English Guide – Company Login & Updated VNN Flow"]];
guide.getRange("A1:D1").format = { fill: navy, font: { bold: true, color: white, size: 16 }, horizontalAlignment: "center", verticalAlignment: "center" };
guide.getRange("A1:D1").format.rowHeight = 30;

guide.mergeCells("A2:D2");
guide.getRange("A2").values = [["This page explains the questionnaire terms. It is provided for discussion only; the client should enter formal answers on the Client Questionnaire sheet."]];
guide.getRange("A2:D2").format = { fill: lightBlue, font: { italic: true, color: "#1D3557", size: 10 }, wrapText: true, verticalAlignment: "center" };
guide.getRange("A2:D2").format.rowHeight = 30;

guide.getRange("A4:D4").values = [["Term / Topic", "Plain-English Explanation", "What exists in the current project", "Recommended direction"]];
guide.getRange("A4:D4").format = { fill: blue, font: { bold: true, color: white, size: 10 }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: border } };
guide.getRange("A4:D4").format.rowHeight = 34;

const guideRows = [
  ["Account book", "An account book is a separately maintained set of business and accounting records. It may represent a legal company, a business division, or a separate accounting identity.", "There is no separate 'Account Book' table or field by that name. The closest existing feature is SubCompany.", "First confirm whether each listed name is truly an account book/legal entity. Then use a clear name such as Operating Company / Account Book in the UI."],
  ["Main Company", "The parent organization/tenant that owns users and data in the application.", "The Company model and every CompanyUser already use companyId as the main tenant boundary.", "Keep one main Company tenant unless the client confirms completely separate organizations."],
  ["SubCompany", "A child organization linked to the main Company. It can represent each operating company/account book.", "A SubCompany master already exists with name, code, parent companyId and active status. Several logistics transactions already save subCompanyId.", "Reuse this structure for the confirmed company list. No new table per company is needed."],
  ["Selected company at login", "The company/account book chosen by a user for the current session.", "Today, users log in with email/password only. Some forms have a manual SubCompany dropdown.", "Put the selected company into the signed login session. The server must enforce it for every read and write."],
  ["Why not separate tables?", "Separate tables would mean separate Orders, VNNs, invoices, etc. for every company.", "The project uses shared MongoDB collections and tenant fields.", "Keep shared collections. Add/use companyId + subCompanyId in each relevant record and filter securely."],
  ["Document numbering", "This is the running number on documents such as VNN-0001 or INV-0001.", "Current counters are normally scoped by the main company.", "Decide whether each account book gets its own sequence (recommended for separate legal/accounting books) or one combined group sequence."],
  ["VNN Part 1", "Vehicle Negotiation Panel: the base negotiation/order information.", "Part 1 can be submitted and locked; the model stores lock time, user and amendment audit entries.", "A VNN should be created inside one active company. Orders chosen for it must belong to the same company."],
  ["VNN Part 2 – Rate Target", "The rate-target stage: max rate, target rate, remarks and voice note.", "Part 2 was moved into its own Rate Target (Vehicle Negotiation) queue/workspace. It appears only after Part 1 is locked.", "Filter the queue by selected company. Give only the selected Part-2 role edit/approve/reject rights for that company."],
  ["VNN Part 3 – Vehicle Placement", "The final supplier, vehicle, rate and payment detail stage.", "Part 3 currently unlocks after Part 1 is locked and Part 2 is approved.", "Filter supplier/vehicle lookup by the selected company if masters are company-specific, and enforce the same company on save."],
  ["Approval and roles", "Which people may perform each action in each VNN stage.", "Current permissions are mostly module-level (view/create/edit/approve). Existing code has stage statuses but needs the final role matrix.", "Use the client’s confirmed role matrix to enforce stage-specific actions in the API, not just disable fields in the screen."],
  ["Historical data", "Records created before company-wise separation is enabled.", "Some logistics records already have SubCompany fields; others may be missing them.", "Assign/confirm a company for existing records before applying strict filters, so valid history does not disappear."],
];
guide.getRange(`A5:D${4 + guideRows.length}`).values = guideRows;
guide.getRange(`A5:D${4 + guideRows.length}`).format = { verticalAlignment: "top", wrapText: true, font: { size: 10, color: "#1F2937" }, borders: { preset: "all", style: "thin", color: border } };
guide.getRange(`A5:A${4 + guideRows.length}`).format = { fill: paleBlue, font: { bold: true, size: 10, color: "#1D4E89" }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: border } };
guide.getRange(`D5:D${4 + guideRows.length}`).format = { fill: paleGreen, font: { size: 10, color: "#375623" }, verticalAlignment: "top", wrapText: true, borders: { preset: "all", style: "thin", color: border } };
for (let row = 5; row <= 4 + guideRows.length; row += 1) {
  guide.getRange(`A${row}:D${row}`).format.rowHeight = 72;
}
guide.getRange("A:A").format.columnWidth = 25;
guide.getRange("B:B").format.columnWidth = 46;
guide.getRange("C:C").format.columnWidth = 48;
guide.getRange("D:D").format.columnWidth = 49;
guide.freezePanes.freezeRows(4);

const questionCheck = await workbook.inspect({ kind: "table", range: "Client Questionnaire!A1:E23", include: "values,formulas", tableMaxRows: 24, tableMaxCols: 5 });
console.log(questionCheck.ndjson);
const guideCheck = await workbook.inspect({ kind: "table", range: "Plain-English Guide!A1:D15", include: "values,formulas", tableMaxRows: 16, tableMaxCols: 4 });
console.log(guideCheck.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
console.log(errors.ndjson);

const preview1 = await workbook.render({ sheetName: "Client Questionnaire", range: "A1:E23", scale: 1.2, format: "png" });
const preview2 = await workbook.render({ sheetName: "Plain-English Guide", range: "A1:D15", scale: 1.2, format: "png" });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(`${outputDir}/questionnaire-preview.png`, new Uint8Array(await preview1.arrayBuffer()));
await fs.writeFile(`${outputDir}/guide-preview.png`, new Uint8Array(await preview2.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Saved ${outputPath}`);
