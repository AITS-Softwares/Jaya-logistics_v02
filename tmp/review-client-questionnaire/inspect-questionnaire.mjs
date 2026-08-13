import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const source = "D:/DOWNLOADS/Company_Login_and_VNN_Workflow_Questionnaire.xlsx";
const blob = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(blob);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 8000,
  tableMaxRows: 26,
  tableMaxCols: 5,
  tableMaxCellChars: 500,
});
console.log(overview.ndjson);

const answers = await workbook.inspect({
  kind: "table",
  range: "Client Questionnaire!A1:E30",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 5,
  tableMaxCellChars: 1000,
});
console.log(answers.ndjson);

const guide = await workbook.inspect({
  kind: "table",
  range: "Plain-English Guide!A1:D20",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 4,
  tableMaxCellChars: 500,
});
console.log(guide.ndjson);

const first = await workbook.render({ sheetName: "Client Questionnaire", range: "A1:E30", scale: 1.2, format: "png" });
const second = await workbook.render({ sheetName: "Plain-English Guide", range: "A1:D20", scale: 1.1, format: "png" });
await fs.writeFile("questionnaire-client-answers.png", new Uint8Array(await first.arrayBuffer()));
await fs.writeFile("guide-client-answers.png", new Uint8Array(await second.arrayBuffer()));
