// Read-only operator check. It deliberately never creates, updates or submits
// ERPNext records. Run: node scripts/erpnext-company-preflight.mjs
import fs from "node:fs";
import { createFrappeClient, isFrappeConfigured } from "../src/lib/frappe-client.mjs";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && match[1].startsWith("FRAPPE_")) {
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

if (!isFrappeConfigured()) throw new Error("ERPNext credentials are not configured.");

const client = createFrappeClient();
const localNames = ["Jaya Global Logistics", "Jaya Logistics", "Neelkanth"];
for (const localSubCompany of localNames) {
  const records = await client.list("Company", {
    fields: ["name", "abbr", "country", "default_currency"],
    filters: [["name", "=", localSubCompany]],
    limitPageLength: 2,
  });
  const company = records[0];
  console.log(JSON.stringify({
    localSubCompany,
    erpnextCompanyFound: Boolean(company),
    erpnextName: company?.name || null,
    abbr: company?.abbr || null,
  }));
}
