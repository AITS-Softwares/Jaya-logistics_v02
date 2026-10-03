// PRODUCTION migration - ONE script (mongosh). For a database still in its ORIGINAL state (OP-0013, JL-ORD-2026-27-00001,
// PURCH-ORD/2025-26/00012, VNN-0023, LD-2025-0012 ...). Also safe on a database already run through the older scripts.
//
// What it does, in one pass (formats unchanged):
//   1. puts the company code in front of every old number (OP-0013 -> JGL-OP-0013, PURCH-GRN/.. -> JGL/PURCH-GRN/.., VNN-0023 -> JGL-VNN-0023)
//   2. restarts every company EXCEPT those in KEEP_NUMBERS_FOR at 0001, 0002, ... (creation/number order) - no carried-over numbers
//   3. rewrites every copy of an old number found in any other collection
//   4. creates the per-company counters the app will continue from
//      documentsequences : "<companyId>:<subCompanyId>:<TYPE>:ALL"  (order panel, purchase order)
//      counters          : "<Type>_<CODE>"                            (sales order, quotation, delivery, GRN, invoices, notes ...)
// Old numbers are kept in legacyOrderPanelNo / legacyDocumentNumber. Collections touched are backed up first.
// Nothing is written if any problem is found.
//
// 1) Deploy the code edits (counter keys "<Type>_<CODE>")  2) DRY_RUN = true, read the output  3) stop the app, DRY_RUN = false, run ONCE.

// ================= SETTINGS =================
const DRY_RUN = true;
const VERBOSE = false;
const BACKUP = true;
const DEFAULT_CODE = "JGL";                 // company for old records that record none
const ALLOW_DEFAULT = true;                 // false = stop and list records that have no company code
const KEEP_NUMBERS_FOR = ["JGL"];           // these companies keep their existing numbers (just get the prefix); [] = renumber everyone
const RENUMBER_ISSUED_INVOICES = false;     // sales invoices are tax documents: counters seeded, numbers left alone
const ORDER_WIDTH = 4;

// ================= DEFINITIONS =================
const ORDER_COLLECTION = "orderpanels";
const ORDER_OLD_NO = /^(?:OP-(\d+)|[A-Z]{1,10}-ORD-(?:\d{4}-\d{2}-)?(\d+))$/;
const ORDER_NEW_NO = /^([A-Z]{1,10})-OP-(\d+)$/;
const ERP = [   // oldUnprefixed: the original data holds these WITHOUT a company code
    { coll: "purchaseorders", field: "documentNumberPurchaseOrder", label: "PURCH-ORD", key: "PurchaseOrder", noYear: true, oldUnprefixed: true, seqType: "PurchaseOrder" },
    { coll: "grns", field: "documentNumberGrn", label: "PURCH-GRN", key: "PurchaseGrn", oldUnprefixed: true },
    { coll: "purchaseinvoices", field: "documentNumberPurchaseInvoice", label: "PURCH-INV", key: "PurchaseInvoice", oldUnprefixed: true },
    { coll: "debitnotes", field: "documentNumberDebitNote", label: "PURCH-DEBIT", key: "PurchaseDebitNote", oldUnprefixed: true },
    { coll: "salesorders", field: "documentNumberOrder", label: "SALES-ORD", key: "SalesOrder" },
    { coll: "salesquotations", field: "documentNumberQuatation", label: "SALES-QUA", key: "SalesQuotation" },
    { coll: "deliveries", field: "documentNumberDelivery", label: "SALES-DEL", key: "Sales Delivery" },
    { coll: "salesinvoices", field: "invoiceNumber", label: "SALES-INV", key: "SalesInvoice", invoice: true },
    { coll: "creditnotes", field: "documentNumberCreditNote", label: "SALES-CREDIT", key: "PurchaseCreditNote" },
    { coll: "purchasequotations", field: "documentNumber", label: "PURCH-QUA", key: "PurchaseQuatation" },
];
const SM_RULES = [
    { coll: "vehiclenegotiations", field: "vnnNo" }, { coll: "pricingpanels", field: "pricingSerialNo" },
    { coll: "loadingpanels", field: "vehicleArrivalNo" }, { coll: "purchasepanels", field: "purchaseNo" },
    { coll: "consignmentnotes", field: "lrNo" }, { coll: "advancepayments", field: "paymentNo" },
];
const LABELS = "VNN|PSN|LD|PUR|LR|ADV";
const SM_OLD_DOC = new RegExp(`^(${LABELS})-(?:(\\d{4}|\\d{6})-)?(\\d+)$`);                // VNN-0023 , LD-2025-0012
const SM_PREFIXED = new RegExp(`^([A-Z]{1,10})-(${LABELS})-(?:(\\d{4})-)?(\\d+)$`);   // NK-VNN-0023 (done by an earlier run); the app's own NK-VNN-2026-27-00001 does not match
const SM_RE = new RegExp(`(?<![A-Za-z0-9-])(?:${LABELS})-\\d+(?:-\\d+)?(?![0-9])`, "g");
const ORDER_TOKEN = /(?<![A-Za-z0-9-])(?:([A-Z]{1,10})-OP-\d+|OP-\d+|[A-Z]{1,10}-ORD-(?:\d{4}-\d{2}-)?\d+)(?![0-9])/g;
const SKIP_KEYS = new Set(["_id", "legacyOrderPanelNo", "legacyDocumentNumber"]);

const hex = (id) => (id && id.toHexString ? id.toHexString() : String(id));
const isPlain = (v) => v && typeof v === "object" && !v._bsontype && !(v instanceof Date) && !(v instanceof RegExp);
const pad = (n, w) => String(n).padStart(w, "0");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isKeep = (code) => KEEP_NUMBERS_FOR.includes(code);
const cmp = (a, b) => (a.seq - b.seq) || String(a.d.createdAt || "").localeCompare(String(b.d.createdAt || "")) || hex(a.d._id).localeCompare(hex(b.d._id));

// ================= SHARED STATE =================
const existing = new Set(db.getCollectionNames());
const subDocs = db.getCollection("subcompanies").find({}, { code: 1, companyId: 1 }).toArray();
const subCode = new Map(subDocs.map((s) => [hex(s._id), String(s.code).toUpperCase()]));
const subByKey = new Map(subDocs.map((s) => [`${hex(s.companyId)}:${String(s.code).toUpperCase()}`, s._id]));
const map = new Map(), plans = [], problems = [], ownField = new Map();
const seqCounters = new Map(), ctrCounters = new Map();          // documentsequences / counters
const addOwn = (c, f) => { if (!ownField.has(c)) ownField.set(c, new Set()); ownField.get(c).add(f); };
const addPlan = (coll, d, field, oldNo, newNo, legacyField, legacyVal) => {
    plans.push({ coll, d, field, oldNo, newNo, legacyField, legacyVal }); map.set(oldNo, newNo); addOwn(coll, field);
};
const addSeq = (companyId, sid, type, code, n) => {
    const id = `${hex(companyId)}:${hex(sid)}:${type}:ALL`; const c = seqCounters.get(id) || { id, companyId, sid, type, max: 0 };
    c.max = Math.max(c.max, n); seqCounters.set(id, c);
};
const addCtr = (companyId, key, code, n) => {
    const id = `${key}_${code}`, k = `${hex(companyId)}:${id}`; const c = ctrCounters.get(k) || { companyId, id, max: 0 };
    c.max = Math.max(c.max, n); ctrCounters.set(k, c);
};
const codeOfDoc = (d) => String(d.subCompanyCode || subCode.get(hex(d.subCompanyId)) || DEFAULT_CODE).toUpperCase();
const groupBy = (items, keyFn) => { const g = new Map(); for (const it of items) { const k = keyFn(it); if (!g.has(k)) g.set(k, []); g.get(k).push(it); } return g; };

// ================= 1. ORDER PANELS =================
const orderCodeById = new Map(), orderCodeByNo = new Map();
{
    const orders = db.getCollection(ORDER_COLLECTION).find({}, { orderPanelNo: 1, legacyOrderPanelNo: 1, subCompanyCode: 1, subCompanyId: 1, companyId: 1, createdAt: 1 }).toArray();
    const items = [];
    for (const d of orders) {
        const cur = d.orderPanelNo || ""; let m;
        if ((m = ORDER_OLD_NO.exec(cur))) items.push({ d, cur, code: codeOfDoc(d), seq: parseInt(m[1] || m[2], 10), old: true });
        else if ((m = ORDER_NEW_NO.exec(cur))) items.push({ d, cur, code: m[1], seq: parseInt(m[2], 10), old: false });
        else problems.push(`Order ${hex(d._id)} has unexpected number "${cur}"`);
    }
    print(`1. Order panels: ${orders.length}`);
    for (const [, list] of groupBy(items, (x) => `${hex(x.d.companyId)}:${x.code}`)) {
        const code = list[0].code, keep = isKeep(code); let last = 0;
        list.sort(cmp);
        list.forEach((it, i) => {
            const n = keep ? it.seq : i + 1;
            const finalNo = keep && !it.old ? it.cur : `${code}-OP-${pad(n, ORDER_WIDTH)}`;
            if (finalNo !== it.cur) addPlan(ORDER_COLLECTION, it.d, "orderPanelNo", it.cur, finalNo, "legacyOrderPanelNo", it.old ? it.cur : (it.d.legacyOrderPanelNo || it.cur));
            if (it.d.legacyOrderPanelNo && it.d.legacyOrderPanelNo !== it.cur && !map.has(it.d.legacyOrderPanelNo)) map.set(it.d.legacyOrderPanelNo, finalNo);
            [it.cur, finalNo, it.d.legacyOrderPanelNo].forEach((k) => k && orderCodeByNo.set(k, code));
            orderCodeById.set(hex(it.d._id), code);
            last = Math.max(last, n);
        });
        const sid = list[0].d.subCompanyId || subByKey.get(`${hex(list[0].d.companyId)}:${code}`);
        if (!sid) problems.push(`No sub-company found for order series ${code}`); else addSeq(list[0].d.companyId, sid, "OP", code, last);
        print(`     ${code}: ${list.length} orders${keep ? " (numbers kept)" : " restarted"} -> ends at ${pad(last, ORDER_WIDTH)}`);
    }
}

// ================= 2. ERP DOCUMENTS =================
for (const r of ERP) {
    if (!existing.has(r.coll)) { print(`2. (skip) collection not found: ${r.coll}`); continue; }
    addOwn(r.coll, r.field);
    const prefixedRe = r.noYear ? /^([A-Z]{1,10})-PURCH-ORD-(\d+)$/ : new RegExp(`^([A-Z]{1,10})/${esc(r.label)}/(\\d{4}-\\d{2})/(\\d+)$`);
    const oldRe = r.noYear ? /^PURCH-ORD\/(\d{4}-\d{2})\/(\d+)$/ : new RegExp(`^${esc(r.label)}/(\\d{4}-\\d{2})/(\\d+)$`);
    const build = (code, fy, n, w) => r.noYear ? `${code}-PURCH-ORD-${pad(n, 4)}` : `${code}/${r.label}/${fy}/${pad(n, w)}`;
    const docs = db.getCollection(r.coll).find({}).toArray();
    const items = []; let other = 0;
    for (const d of docs) {
        const cur = d[r.field] || ""; let m;
        if ((m = prefixedRe.exec(cur))) items.push({ d, cur, code: m[1], fy: r.noYear ? null : m[2], seq: parseInt(r.noYear ? m[2] : m[3], 10), w: (r.noYear ? m[2] : m[3]).length, old: false });
        else if (r.oldUnprefixed && (m = oldRe.exec(cur))) items.push({ d, cur, code: codeOfDoc(d), fy: m[1], seq: parseInt(m[2], 10), w: m[2].length, old: true });
        else other++;
    }
    let renamed = 0;
    for (const [, list] of groupBy(items, (x) => `${hex(x.d.companyId)}:${x.code}`)) {
        const code = list[0].code, keep = isKeep(code), skip = keep || (r.invoice && !RENUMBER_ISSUED_INVOICES); let last = 0;
        if (!list[0].d.companyId) { problems.push(`${r.coll} ${list[0].cur} has no companyId`); continue; }
        list.sort(cmp);
        list.forEach((it, i) => {
            const n = skip ? it.seq : i + 1;
            const finalNo = skip && !it.old ? it.cur : build(code, it.fy, n, it.w);
            if (finalNo !== it.cur) { addPlan(r.coll, it.d, r.field, it.cur, finalNo, "legacyDocumentNumber", it.old ? it.cur : (it.d.legacyDocumentNumber || it.cur)); renamed++; }
            if (it.d.legacyDocumentNumber && it.d.legacyDocumentNumber !== it.cur && !map.has(it.d.legacyDocumentNumber)) map.set(it.d.legacyDocumentNumber, finalNo);
            last = Math.max(last, n);
        });
        addCtr(list[0].d.companyId, r.key, code, last);
        if (r.seqType) {
            const sid = list[0].d.subCompanyId || subByKey.get(`${hex(list[0].d.companyId)}:${code}`);
            if (!sid) problems.push(`No sub-company for ${code} (${r.coll})`); else addSeq(list[0].d.companyId, sid, r.seqType, code, last);
        }
    }
    print(`2. ${r.coll}.${r.field}: ${docs.length} docs | to rename: ${renamed} | other formats: ${other}`);
}

// ================= 3. SALES-MENU SERIALS =================
{
    const strings = (v, out) => {
        if (typeof v === "string") out.push(v); else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
        else if (isPlain(v)) Object.keys(v).forEach((k) => { if (!SKIP_KEYS.has(k)) strings(v[k], out); });
        return out;
    };
    const codeFromRefs = (v) => {
        if (v && v._bsontype === "ObjectId") return orderCodeById.get(hex(v)) || null;
        if (typeof v === "string") { ORDER_TOKEN.lastIndex = 0; let m; while ((m = ORDER_TOKEN.exec(v))) { const c = m[1] || orderCodeByNo.get(m[0]); if (c) return c; } return null; }
        if (Array.isArray(v)) { for (const x of v) { const c = codeFromRefs(x); if (c) return c; } return null; }
        if (isPlain(v)) { for (const k of Object.keys(v)) { if (SKIP_KEYS.has(k)) continue; const c = codeFromRefs(v[k]); if (c) return c; } }
        return null;
    };
    const codeFor = (d) => {
        if (d.subCompanyCode) return [String(d.subCompanyCode).toUpperCase(), "subCompanyCode"];
        if (d.subCompanyId && subCode.get(hex(d.subCompanyId))) return [subCode.get(hex(d.subCompanyId)), "subCompanyId"];
        const c = codeFromRefs(d); if (c) return [c, "order reference"];
        return [DEFAULT_CODE, "DEFAULT"];
    };
    const codeOf = new Map(), resolved = new Map(), pending = [], docsBy = new Map();
    for (const r of SM_RULES) {
        if (!existing.has(r.coll)) continue;
        const docs = db.getCollection(r.coll).find({}).toArray(); docsBy.set(r.coll, docs);
        for (const d of docs) {
            const cur = d[r.field] || ""; if (!SM_OLD_DOC.test(cur)) continue;
            const [code, how] = codeFor(d); resolved.set(`${r.coll}:${hex(d._id)}`, [code, how]);
            if (how === "DEFAULT") pending.push({ r, d, cur }); else codeOf.set(cur, code);
        }
    }
    for (let round = 0; round < 5 && pending.length; round++) {      // documents with no code inherit it from the documents they link to
        let changed = false;
        for (let i = pending.length - 1; i >= 0; i--) {
            const { r, d, cur } = pending[i]; const found = new Set();
            strings(d, []).forEach((t) => { (t.match(SM_RE) || []).forEach((n) => { if (n !== cur && codeOf.has(n)) found.add(codeOf.get(n)); }); });
            if (found.size === 1) { const code = [...found][0]; resolved.set(`${r.coll}:${hex(d._id)}`, [code, "linked document"]); codeOf.set(cur, code); pending.splice(i, 1); changed = true; }
        }
        if (!changed) break;
    }
    for (const r of SM_RULES) {
        if (!existing.has(r.coll)) { print(`3. (skip) collection not found: ${r.coll}`); continue; }
        addOwn(r.coll, r.field);
        const docs = docsBy.get(r.coll), items = []; let other = 0; const src = {};
        for (const d of docs) {
            const cur = d[r.field] || ""; let m;
            if ((m = SM_OLD_DOC.exec(cur))) {
                const [code, how] = resolved.get(`${r.coll}:${hex(d._id)}`); src[how] = (src[how] || 0) + 1;
                if (how === "DEFAULT" && !ALLOW_DEFAULT) problems.push(`No company code found for ${cur} in ${r.coll} (${hex(d._id)})`);
                items.push({ d, cur, code, label: m[1], year: m[2] || "", seq: parseInt(m[3], 10), w: m[3].length, old: true });
            } else if ((m = SM_PREFIXED.exec(cur))) items.push({ d, cur, code: m[1], label: m[2], year: m[3] || "", seq: parseInt(m[4], 10), w: m[4].length, old: false });
            else other++;
        }
        let renamed = 0;
        for (const [, list] of groupBy(items, (x) => `${hex(x.d.companyId)}:${x.code}:${x.label}:${x.year}`)) {
            const code = list[0].code, keep = isKeep(code); list.sort(cmp);
            list.forEach((it, i) => {
                const n = (keep || it.label === "LR") ? it.seq : i + 1;
                const finalNo = keep && !it.old ? it.cur : `${code}-${it.label}-${it.year ? it.year + "-" : ""}${pad(n, it.w)}`;
                if (finalNo !== it.cur) { addPlan(r.coll, it.d, r.field, it.cur, finalNo, "legacyDocumentNumber", it.old ? it.cur : (it.d.legacyDocumentNumber || it.cur)); renamed++; }
                if (it.d.legacyDocumentNumber && it.d.legacyDocumentNumber !== it.cur && !map.has(it.d.legacyDocumentNumber)) map.set(it.d.legacyDocumentNumber, finalNo);
            });
        }
        print(`3. ${r.coll}.${r.field}: ${docs.length} docs | to rename: ${renamed} | other formats (left alone): ${other}`);
        if (Object.keys(src).length) print(`     company taken from: ${JSON.stringify(src)}`);
    }
}

// ================= DUPLICATE CHECK =================
{
    const finals = new Map();
    for (const p of plans) { const k = `${p.coll}:${p.newNo}`; if (finals.has(k)) problems.push(`Duplicate ${p.newNo} in ${p.coll}`); finals.set(k, true); }
    for (const [coll, fields] of ownField) for (const f of fields) {
        if (!existing.has(coll)) continue;
        const renamedIds = new Set(plans.filter((p) => p.coll === coll).map((p) => hex(p.d._id)));
        db.getCollection(coll).find({}, { [f]: 1 }).forEach((d) => { if (renamedIds.has(hex(d._id)) || !d[f]) return; if (finals.has(`${coll}:${d[f]}`)) problems.push(`${d[f]} in ${coll} clashes with a renamed number`); });
    }
}

// ================= SUMMARY =================
print(`\nTotal documents to rename: ${plans.length}`);
plans.slice(0, 15).forEach((p) => print(`  [${p.coll}] ${p.oldNo} -> ${p.newNo}`));
print("Counters (documentsequences):"); seqCounters.forEach((c) => print(`  ${c.type} ${c.id.split(":")[1].slice(-6)}.. -> ${c.max}`));
print("Counters (counters collection):"); ctrCounters.forEach((c) => print(`  ${c.id} -> ${c.max}`));
if (problems.length) { print("PROBLEMS (fix before applying):"); problems.forEach((x) => print("  " + x)); }

// ================= COPIES OF OLD NUMBERS =================
const copyOps = new Map();
if (map.size) {
    const alt = [...map.keys()].sort((a, b) => b.length - a.length).map(esc).join("|");
    const rx = new RegExp(`(?<![A-Za-z0-9/-])(?:${alt})(?![0-9A-Za-z]|-\\d)`, "g"), probe = new RegExp(rx.source);
    const fix = (v, st, p) => {
        if (typeof v === "string") return v.replace(rx, (t) => { if (!map.has(t)) return t; st.n++; st.log.push(`${p}: ${t} -> ${map.get(t)}`); return map.get(t); });
        if (Array.isArray(v)) return v.map((x, i) => fix(x, st, `${p}[${i}]`));
        if (isPlain(v)) { const o = {}; for (const k of Object.keys(v)) o[k] = fix(v[k], st, `${p}.${k}`); return o; }
        return v;
    };
    for (const name of existing) {
        if (name.startsWith("system.") || /_bak/.test(name) || name === "documentsequences" || name === "counters") continue;
        let docs = 0, reps = 0;
        db.getCollection(name).find({}).forEach((d) => {
            if (!probe.test(JSON.stringify(d))) return;
            const own = ownField.get(name) || new Set(); const sets = {}, st = { n: 0, log: [] };
            for (const k of Object.keys(d)) { if (SKIP_KEYS.has(k) || own.has(k)) continue; const b = st.n, nv = fix(d[k], st, k); if (st.n > b) sets[k] = nv; }
            if (!st.n) return;
            docs++; reps += st.n;
            if (VERBOSE) { print(`  [${name}] ${hex(d._id)}`); st.log.forEach((l) => print(`      ${l}`)); }
            if (!copyOps.has(name)) copyOps.set(name, []);
            copyOps.get(name).push({ _id: d._id, sets });
        });
        if (docs) print(`${name}: ${docs} documents, ${reps} text replacements`);
    }
}

// ================= WRITE =================
if (DRY_RUN) print("\nDRY RUN - nothing was changed.");
else if (problems.length) print("\nAborted: fix the problems above first. Nothing was changed.");
else {
    if (BACKUP) {
        const t = new Date().toISOString(), stamp = t.slice(0, 10).replace(/-/g, "") + "_" + t.slice(11, 16).replace(":", "");
        for (const name of new Set(["documentsequences", "counters", ...plans.map((p) => p.coll), ...copyOps.keys()])) {
            if (!existing.has(name)) continue;
            const bak = `${name}_bak_${stamp}`;
            try { db.getCollection(name).aggregate([{ $match: {} }, { $out: bak }]).toArray(); } catch (e) { if (!/exhausted/i.test(String(e && e.message))) throw e; }
            const a = db.getCollection(name).countDocuments({}), b = db.getCollection(bak).countDocuments({});
            if (a !== b) throw new Error(`Backup of ${name} incomplete (${b}/${a}). Nothing was changed.`);
            print(`Backup: ${name} -> ${bak} (${b} docs)`);
        }
    }
    for (const coll of new Set(plans.map((p) => p.coll))) {           // unique indexes: go through temporary names first
        const mine = plans.filter((p) => p.coll === coll);
        db.getCollection(coll).bulkWrite(mine.map((p) => ({ updateOne: { filter: { _id: p.d._id }, update: { $set: { [p.field]: `TMP-${hex(p.d._id)}` } } } })), { ordered: false });
        db.getCollection(coll).bulkWrite(mine.map((p) => ({ updateOne: { filter: { _id: p.d._id }, update: { $set: { [p.field]: p.newNo, [p.legacyField]: p.legacyVal } } } })), { ordered: false });
    }
    for (const [name, ops] of copyOps)
        db.getCollection(name).bulkWrite(ops.map((x) => ({ updateOne: { filter: { _id: x._id }, update: { $set: x.sets } } })), { ordered: false });
    seqCounters.forEach((c) => db.getCollection("documentsequences").updateOne({ _id: c.id },
        { $max: { sequence: c.max }, $setOnInsert: { companyId: c.companyId, subCompanyId: c.sid, documentType: c.type, financialYear: "ALL" } }, { upsert: true }));
    ctrCounters.forEach((c) => db.getCollection("counters").updateOne({ companyId: c.companyId, id: c.id }, { $max: { seq: c.max } }, { upsert: true }));
    print(`\nDone. Renamed ${plans.length} documents, updated ${[...copyOps.values()].reduce((a, b) => a + b.length, 0)} other documents, set ${seqCounters.size + ctrCounters.size} counters.`);
}