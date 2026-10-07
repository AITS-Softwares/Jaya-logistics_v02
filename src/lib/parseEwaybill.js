const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

function toIso(d, m, y) {
    d = Number(d); m = Number(m); y = Number(y);
    if (y < 100) y += 2000;
    if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2017 && y <= 2100)) return "";
    return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseDate(s = "") {
    let m = s.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);                 // 2026-10-14
    if (m) return toIso(m[3], m[2], m[1]);
    m = s.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);                   // 14/10/2026
    if (m) return toIso(m[1], m[2], m[3]);
    m = s.match(/\b(\d{1,2})[\s-]+([A-Za-z]{3})[a-z]*[\s,.-]+(\d{2,4})\b/);     // 14 Oct 2026
    if (m && MONTHS[m[2].toLowerCase()]) return toIso(m[1], MONTHS[m[2].toLowerCase()], m[3]);
    return "";
}

// Finds a 12-digit e-way bill number written after an e-way bill label.
export function parseEwaybill(text = "") {
    const t = String(text).replace(/\r/g, "");
    const label = /e[\s\-]*way[\s\-]*bill(?:\s*(?:no\.?|number|#|id))?|\bewb(?:\s*(?:no\.?|number))?|\bEBN\b/gi;
    let match;
    while ((match = label.exec(t))) {
        const after = t.slice(match.index + match[0].length, match.index + match[0].length + 60);
        const m = after.match(/(?:^|[^\d])(\d{4})[\s\-]?(\d{4})[\s\-]?(\d{4})(?!\d)/);
        if (!m) continue;
        const ewaybillNo = m[1] + m[2] + m[3];
        const near = t.slice(match.index, match.index + 400);
        const v = near.match(/(?:valid(?:ity)?\s*(?:up\s*to|upto|till|until|through)?|expir(?:y|es)(?:\s*date)?)\s*[:\-]?\s*([^\n]{0,30})/i);
        return { found: true, ewaybillNo, expiryDate: v ? parseDate(v[1]) : "" };
    }
    return { found: false, ewaybillNo: "", expiryDate: "" };
}