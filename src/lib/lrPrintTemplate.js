// src/lib/lrPrintTemplate.js
//
// ONE print layout for the Consignment Note (LR). The HTML below is the same layout the
// Consignment Note page generates; the Loading Info page uses it for both View and Print.

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

const DEFAULT_BUSINESS_INFO = {
    companyName: "Jaya Logistics",
    address: "Office - 404, A - Wing 4th Floor, Shelton Sapphire, Sector - 15, Belapur Navi Mumbai - 400614",
    phone: "Tel - 022 27578844",
    fax: "Fax - 022 27570044",
    gst: "GST NO - 27CDHPS2205M12A",
    pan: "PAN: CDHPS2205M",
    transportGst: "27AAMFS9446C1ZU",
    emergencyContact: "9653489852 9004645555"
};

export async function getBusinessInfo() {
    let businessInfo = { ...DEFAULT_BUSINESS_INFO };
    try {
        const token = localStorage.getItem("token");
        const bizRes = await fetch("/api/business-info", { headers: { Authorization: `Bearer ${token}` } });
        if (bizRes.ok) {
            const bizData = await bizRes.json();
            if (bizData.success && bizData.data) businessInfo = { ...businessInfo, ...bizData.data };
        }
    } catch (err) {
        console.warn("Could not fetch business info, using defaults", err);
    }
    return businessInfo;
}

/** Build the LR print HTML from a saved Consignment Note document. */
export function buildLRHtml(note, businessInfo, loadingInfoNoArg = "") {
    const h = note.header || {};
    const header = {
        lrNo: note.lrNo || "",
        lrDate: h.lrDate || "",
        vehicleNo: h.vehicleNo || "",
        partyNo: h.partyNo || "",
        from: h.from || "",
        to: h.to || "",
        unit: h.unit || "MT",
        lcStatus: note.lcStatus || h.lcStatus || "Not LC",
        lrType: note.lrType || h.lrType || "Normal",
        vehicleReach: note.vehicleReach || h.vehicleReach || "Not Reach",
        verification: note.verification || h.verification || "Not Verified",
        subCompanyName: note.subCompanyName || h.subCompanyName || "",
        subCompanyCode: note.subCompanyCode || h.subCompanyCode || "",
    };
    const consignor = note.consignor || {};
    const consignee = note.consignee || {};
    const invoice = {
        boeInvoice: note.invoice?.boeInvoice || "As Per Invoice",
        boeInvoiceNo: note.invoice?.boeInvoiceNo || "",
        boeInvoiceDate: note.invoice?.boeInvoiceDate || "",
        invoiceValue: note.invoice?.invoiceValue || "",
    };
    const ewaybill = note.ewaybill || {};
    const pack = note.packData || {};
    const palletizationRows = pack.PALLETIZATION || [];
    const uniformRows = pack["UNIFORM - BAGS/BOXES"] || [];
    const looseCargoRows = pack["LOOSE - CARGO"] || [];
    const nonUniformRows = pack["NON-UNIFORM - GENERAL CARGO"] || [];
    const loadingInfoNo = note.loadingInfoNo || loadingInfoNoArg || "";

    // Prepare product data display
    const allProducts = [];
    let totalPackages = 0;
    let totalActualWeight = 0;
    let totalChargedWeight = 0;

    // Process palletization rows
    palletizationRows.forEach(row => {
        if (row.productName) {
            allProducts.push({
                description: `${row.productName}${row.skuSize ? ` (${row.skuSize})` : ''}${row.pkgsType ? ` - ${row.pkgsType}` : ''}`,
                packages: row.totalPkgs || row.noOfPallets * (row.unitPerPallets || 1) || 0,
                actualWeight: num(row.actualWt),
                chargedWeight: num(row.chargedWt)
            });
            totalPackages += row.totalPkgs || row.noOfPallets * (row.unitPerPallets || 1) || 0;
            totalActualWeight += num(row.actualWt);
            totalChargedWeight += num(row.chargedWt);
        }
    });

    // Process uniform rows
    uniformRows.forEach(row => {
        if (row.productName) {
            allProducts.push({
                description: `${row.productName}${row.skuSize ? ` (${row.skuSize})` : ''}${row.pkgsType ? ` - ${row.pkgsType}` : ''}`,
                packages: row.totalPkgs || 0,
                actualWeight: num(row.actualWt),
                chargedWeight: num(row.chargedWt)
            });
            totalPackages += row.totalPkgs || 0;
            totalActualWeight += num(row.actualWt);
            totalChargedWeight += num(row.chargedWt);
        }
    });

    // Process loose cargo rows
    looseCargoRows.forEach(row => {
        if (row.productName) {
            allProducts.push({
                description: `${row.productName} (Loose Cargo)`,
                packages: 0,
                actualWeight: num(row.actualWt),
                chargedWeight: num(row.chargedWt)
            });
            totalActualWeight += num(row.actualWt);
            totalChargedWeight += num(row.chargedWt);
        }
    });

    // Process non-uniform rows
    nonUniformRows.forEach(row => {
        if (row.productName) {
            allProducts.push({
                description: `${row.productName}${row.length && row.width && row.height ? ` (${row.length}x${row.width}x${row.height})` : ''}`,
                packages: row.nos || 0,
                actualWeight: num(row.actualWt),
                chargedWeight: num(row.chargedWt)
            });
            totalPackages += row.nos || 0;
            totalActualWeight += num(row.actualWt);
            totalChargedWeight += num(row.chargedWt);
        }
    });

    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentDateTime = new Date().toLocaleString();

    // Build an HTML string that looks like the PDF/Consignment Note
    const lrHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>LR - ${header.lrNo || 'Consignment Note'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              background: #fff;
              padding: 20px;
              font-size: 12px;
            }
            .container {
              max-width: 900px;
              margin: 0 auto;
              border: 1px solid #000;
              padding: 10px;
            }
            .header-top {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #000;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .company-name {
              font-size: 18px;
              font-weight: bold;
            }
            .jurisdiction {
              font-size: 10px;
              font-weight: bold;
              border: 1px solid #000;
              padding: 2px 5px;
            }
            .terms-box {
              font-size: 8px;
              border: 1px solid #000;
              padding: 5px;
              margin: 5px 0;
              text-align: center;
            }
            .risk-note {
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              margin: 3px 0;
            }
            .party-details {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              border: 1px solid #000;
              padding: 5px;
            }
            .party-box {
              width: 48%;
            }
            .section-title {
              font-weight: bold;
              border-bottom: 1px solid #000;
              margin-bottom: 5px;
              font-size: 11px;
            }
            .info-row {
              display: flex;
              margin: 2px 0;
              font-size: 9px;
            }
            .info-label {
              width: 100px;
              font-weight: bold;
            }
            .info-value {
              flex: 1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #000;
              padding: 4px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f0f0f0;
              font-weight: bold;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .footer {
              margin-top: 15px;
              display: flex;
              justify-content: space-between;
              border-top: 1px solid #000;
              padding-top: 10px;
              font-size: 9px;
            }
            .signature-box {
              width: 45%;
            }
            .declaration {
              font-size: 8px;
              margin: 5px 0;
              font-style: italic;
            }
            .ewb-container {
              font-size: 9px;
              font-weight: bold;
              background: #f9f9f9;
              padding: 5px;
              margin: 5px 0;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              .container {
                max-width: 100%;
                margin: 0;
                border: none;
              }
              .no-break {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header Section -->
            <div class="header-top">
              <div>
                <div class="company-name">${businessInfo.companyName || 'Jaya Logistics'}</div>
                <div style="font-size: 8px;">${businessInfo.address || 'Office - 404, A - Wing 4th Floor, Shelton Sapphire, Sector - 15, Belapur Navi Mumbai - 400614'}</div>
                <div style="font-size: 8px;">${businessInfo.phone || 'Tel - 022 27578844'} | ${businessInfo.fax || 'Fax - 022 27570044'}</div>
                <div style="font-size: 8px;">${businessInfo.gst || 'GST NO - 27CDHPS2205M12A'}</div>
              </div>
              <div class="jurisdiction">SUBJECT TO MUMBAI JURISDICTION ONLY</div>
            </div>

            <!-- Terms and Conditions -->
            <div class="terms-box">
              This consignment will not be detained, re routed or re-booked without Consignor's written permission. 
              It will be delivered at the destination. NOT RESPONSIBLE FOR ANY LEAKAGE, BREAKAGE, DAMAGE, FIRE &amp; RIOTS
            </div>

            <div class="risk-note">
              AT OWNER'S RISK - The customer has stated that: He has not insured the consignment
            </div>

            <!-- Emergency Contact & Vehicle -->
            <div class="info-row">
              <span class="info-label">Vehicle No:</span>
              <span class="info-value"><strong>${header.vehicleNo || 'MH17BY9912'}</strong></span>
              <span class="info-label">Emergency Contact:</span>
              <span class="info-value">${businessInfo.emergencyContact || '9653489852 9004645555'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Transport GST:</span>
              <span class="info-value">${businessInfo.transportGst || '27AAMFS9446C1ZU'}</span>
              <span class="info-label">E-Way Bill No:</span>
              <span class="info-value">${ewaybill.ewaybillNo || (ewaybill.status ? ewaybill.status : '')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Container No:</span>
              <span class="info-value">${ewaybill.containerNo || ''}</span>
            </div>

            <!-- From / To -->
            <div class="info-row">
              <span class="info-label">From:</span>
              <span class="info-value"><strong>${header.from || 'DIGHODE'}</strong></span>
              <span class="info-label">To:</span>
              <span class="info-value"><strong>${header.to || 'DHULE'}</strong></span>
            </div>

            <!-- LC Status & LR Type -->
            <div class="info-row">
              <span class="info-label">LC Status:</span>
              <span class="info-value"><strong>${header.lcStatus || 'Not LC'}</strong></span>
              <span class="info-label">LR Type:</span>
              <span class="info-value"><strong>${header.lrType || 'Normal'}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Vehicle Reach:</span>
              <span class="info-value"><strong>${header.vehicleReach || 'Not Reach'}</strong></span>
              <span class="info-label">Verification:</span>
              <span class="info-value"><strong>${header.verification || 'Not Verified'}</strong></span>
            </div>
            // ${header.vehicleUnloadedDate ? `
            // <div class="info-row">
            //   <span class="info-label">Vehicle Unloaded:</span>
            //   <span class="info-value"><strong>${header.vehicleUnloadedDate}</strong></span>
            // </div>
            // ` : ''}
            // ${header.remarks ? `
            // <div class="info-row">
            //   <span class="info-label">Remarks:</span>
            //   <span class="info-value">${header.remarks}</span>
            // </div>
            // ` : ''}

            <!-- Sub-Company Display -->
            ${header.subCompanyName ? `
            <div class="info-row">
              <span class="info-label">Sub-Company:</span>
              <span class="info-value"><strong>${header.subCompanyName} (${header.subCompanyCode})</strong></span>
            </div>
            ` : ''}

            <!-- Consignor / Consignee -->
            <div class="party-details">
              <div class="party-box">
                <div class="section-title">CONSIGNOR</div>
                <div><strong>${consignor.name || ''}</strong></div>
                <div style="font-size: 8px;">${consignor.address || ''}</div>
                ${consignor.selectedAddressTitle ? `<div style="font-size: 8px;">${consignor.selectedAddressTitle}</div>` : ''}
              </div>
              <div class="party-box">
                <div class="section-title">CONSIGNEE</div>
                <div><strong>${consignee.name || ''}</strong></div>
                <div style="font-size: 8px;">${consignee.address || ''}</div>
                ${consignee.selectedAddressTitle ? `<div style="font-size: 8px;">${consignee.selectedAddressTitle}</div>` : ''}
              </div>
            </div>

            <!-- Goods Details -->
            <div class="section-title">GOODS DESCRIPTION</div>
            <table>
              <thead>
                <tr>
                  <th width="5%">#</th>
                  <th width="40%">DESCRIPTION (Said to contain)</th>
                  <th width="10%">PKGS</th>
                  <th width="10%">ACTUAL WT</th>
                  <th width="10%">CHARGED WT</th>
                  <th width="10%">UOM</th>
                </tr>
              </thead>
              <tbody>
                ${allProducts.map((prod, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td>${prod.description}</td>
                    <td class="text-center">${prod.packages || '-'}</td>
                    <td class="text-right">${prod.actualWeight.toFixed(2)}</td>
                    <td class="text-right">${prod.chargedWeight.toFixed(2)}</td>
                    <td class="text-center">${header.unit || 'MT'}</td>
                  </tr>
                `).join('')}
                ${allProducts.length === 0 ? `
                  <tr>
                    <td colspan="6" class="text-center">- No product details available -</td>
                  </tr>
                ` : ''}
              </tbody>
              <tfoot>
                <tr style="background: #f5f5f5;">
                  <td colspan="2" class="text-right"><strong>TOTAL</strong></td>
                  <td class="text-center"><strong>${totalPackages || '-'}</strong></td>
                  <td class="text-right"><strong>${totalActualWeight.toFixed(2)}</strong></td>
                  <td class="text-right"><strong>${totalChargedWeight.toFixed(2)}</strong></td>
                  <td class="text-center"><strong>${header.unit || 'MT'}</strong></td>
                </tr>
              </tfoot>
            </table>

            <!-- Invoice / BOE Details -->
            <div class="info-row">
              <span class="info-label">BOE/INV:</span>
              <span class="info-value">${invoice.boeInvoice || 'As Per Invoice'}</span>
              <span class="info-label">No:</span>
              <span class="info-value">${invoice.boeInvoiceNo || ''}</span>
              <span class="info-label">Date:</span>
              <span class="info-value">${invoice.boeInvoiceDate || ''}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Value:</span>
              <span class="info-value">${invoice.invoiceValue || 'AS PER INVOICE'}</span>
            </div>

            <!-- Additional Info -->
            <div class="info-row">
              <span class="info-label">LR No:</span>
              <span class="info-value"><strong>${header.lrNo || ''}</strong></span>
              <span class="info-label">LR Date:</span>
              <span class="info-value">${header.lrDate || currentDate}</span>
              <span class="info-label">Party No:</span>
              <span class="info-value">${header.partyNo || ''}</span>
            </div>

            ${loadingInfoNo ? `
            <div class="info-row">
              <span class="info-label">Loading Info No:</span>
              <span class="info-value">${loadingInfoNo}</span>
            </div>
            ` : ''}

            <div class="declaration">
              We hereby certify that we have not availed credit of GST paid on inward supplies under the provision of sec 16 of GST ACT 2017.
              Agreed with the conditions given overleaf. This consignment is at Owner's Risk.
            </div>

            <!-- Footer Signatures -->
            <div class="footer">
              <div class="signature-box">
                <div class="section-title">FOR ${businessInfo.companyName || 'Jaya Logistics'}</div>
                <div style="margin-top: 20px;">Authorised Signatory</div>
              </div>
              <div class="signature-box">
                <div class="section-title">CONSIGNOR'S SIGNATURE</div>
                <div style="margin-top: 20px;">_________________________</div>
              </div>
              <div class="signature-box">
                <div class="section-title">CONSIGNEE'S STAMP & SIGN</div>
                <div style="margin-top: 20px;">_________________________</div>
              </div>
            </div>

            <div style="margin-top: 8px; font-size: 7px; text-align: center; border-top: 1px dashed #ccc; padding-top: 5px;">
              Generated on: ${currentDateTime} | This is a system generated LR Document
            </div>
          </div>
        </body>
        </html>
      `;


    return lrHtml;
}

/**
 * Print one LR. The print is recorded on the server first (the last LR to be printed sets
 * the Loading Info Out Date/Time). The window is opened immediately so pop-up blockers allow it.
 */
export async function recordAndPrintLR(panelId, note, loadingInfoNo = "") {
    const win = window.open("", "_blank");
    if (!win) throw new Error("Please allow pop-ups to print the LR.");
    try {
        const res = await fetch(`/api/loading-panel/${encodeURIComponent(panelId)}/lr-print`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
            body: JSON.stringify({ lrId: note._id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json.message || "Unable to print the LR.");
        const html = buildLRHtml(note, await getBusinessInfo(), loadingInfoNo);
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { try { win.print(); } catch { /* window closed */ } }, 400);
        return json.data || {};
    } catch (e) {
        win.close();
        throw e;
    }
}