

// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { usePermission } from "../hooks/usePermission";
// import TrackingMap from "@/app/api/tracking/TrackingMap";

// const MODULE_NAME = "Tracking Plan";
// const dash = "—";
// const valueOf = (value) => (value === 0 ? "0" : value || dash);
// const formatDate = (value) => {
//   if (!value) return dash;
//   const date = new Date(value);
//   return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB").format(date);
// };

// // Same yellow scale the rest of the project uses:
// // headers bg-yellow-400 + border-yellow-500, soft fills yellow-50/100, borders yellow-300,
// // focus ring yellow-200, primary buttons bg-yellow-600 hover:bg-yellow-700.
// const CARD = "rounded-xl border border-slate-200 bg-white shadow-sm";

// export default function TrackingPlanPage() {
//   const { canView, loading: permissionLoading } = usePermission();
//   const [loadings, setLoadings] = useState([]);
//   const [selectedId, setSelectedId] = useState("");
//   const [selected, setSelected] = useState(null);
//   const [listLoading, setListLoading] = useState(false);
//   const [detailLoading, setDetailLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [stops, setStops] = useState([]);
//   const [geo, setGeo] = useState({});               // stop sequence -> { lat, lng, accuracy }
//   const [routeInfo, setRouteInfo] = useState(null); // { distanceKm, plan, ... } from /api/tracking/route
//   const [mapNote, setMapNote] = useState("");
//   const requestRef = useRef(0);                      // ignores answers for a loading the user has already left

//   useEffect(() => {
//     if (permissionLoading || !canView(MODULE_NAME)) return;
//     let active = true;
//     const loadLrs = async () => {
//       setListLoading(true); setError("");
//       try {
//         const response = await fetch("/api/loading-panel?format=table", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
//         const data = await response.json().catch(() => ({}));
//         if (!response.ok || !data.success) throw new Error(data.message || "Unable to load Loading Info.");
//         if (active) setLoadings(data.data || []);
//       } catch (requestError) { if (active) setError(requestError.message || "Unable to load Loading Info."); }
//       finally { if (active) setListLoading(false); }
//     };
//     loadLrs();
//     return () => { active = false; };
//   }, [permissionLoading, canView]);

//   const selectLoading = async (id) => {
//     const requestId = ++requestRef.current;
//     setSelectedId(id); setSelected(null); setError(""); setStops([]); setGeo({}); setRouteInfo(null); setMapNote("");
//     if (!id) return;
//     setDetailLoading(true);
//     try {
//       const headers = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };

//       // 1) The loading is the source of truth
//       const lpRes = await fetch(`/api/loading-panel?id=${encodeURIComponent(id)}`, { headers });
//       const lpData = await lpRes.json().catch(() => ({}));
//       if (!lpRes.ok || !lpData.success) throw new Error(lpData.message || "Unable to load the selected Loading Info.");

//       // 2) LRs are optional (none may exist yet). The API returns one LR today; a list is accepted too.
//       const lrRes = await fetch(`/api/consignment-note?loadingInfoNo=${encodeURIComponent(lpData.data.vehicleArrivalNo)}`, { headers });
//       const lrData = await lrRes.json().catch(() => ({}));
//       const lrList = lrRes.ok && lrData.success ? [].concat(lrData.data || []) : [];

//       setSelected(buildSelected(lpData.data, lrList));
//       // Customer-master addresses are an extra: a failure here must not break the page.
//       let master = { matches: {}, unmatched: {} };
//       try {
//         const stRes = await fetch(`/api/tracking/stops?loadingId=${encodeURIComponent(id)}`, { headers });
//         const stData = await stRes.json().catch(() => ({}));
//         if (stRes.ok && stData.success) master = { matches: stData.data.matches || {}, unmatched: stData.data.unmatched || {} };
//       } catch { /* keep the approximate addresses */ }
//       const built = buildStops(lpData.data, lrList, master);
//       setStops(built);
//       locateStops(built, headers, requestId); // map and route load after the page is already usable
//     } catch (requestError) { setError(requestError.message || "Unable to load the selected Loading Info."); }
//     finally { setDetailLoading(false); }
//   };
//   // Geocode the stops, then plan the route through the located ones. Both are extras: a failure only sets the map note.
//   const locateStops = async (list, headers, requestId) => {
//     const post = async (url, body) => {
//       const res = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
//       return { res, data: await res.json().catch(() => ({})) };
//     };
//     try {
//       const { res, data } = await post("/api/tracking/geocode", {
//         stops: list.map((s) => ({ key: String(s.sequence), text: s.address?.text, city: s.place?.city, pin: s.place?.pin })),
//       });
//       if (requestId !== requestRef.current) return;
//       if (!res.ok || !data.success) {
//         setMapNote(data.code === "NOT_CONFIGURED" ? "Route planning is off: ROUTES_API_KEY is not set in .env.local." : data.message || "Unable to locate the stops.");
//         return;
//       }
//       const located = {};
//       for (const [key, r] of Object.entries(data.data.results || {})) if (r.status === "ok") located[key] = { lat: r.lat, lng: r.lng, accuracy: r.accuracy };
//       setGeo(located);
//       if (data.data.warning) setMapNote(data.data.warning);

//       const points = list.filter((s) => located[String(s.sequence)]).map((s) => located[String(s.sequence)]);
//       if (points.length < 2) return;
//       const { res: rRes, data: rData } = await post("/api/tracking/route", { stops: points });
//       if (requestId !== requestRef.current) return;
//       if (rRes.ok && rData.success) setRouteInfo(rData.data);
//       else setMapNote(rData.code === "NOT_CONFIGURED" ? "Route planning is off: GOOGLE_MAPS_SERVER_KEY is not set." : rData.message || "Unable to plan the route.");
//     } catch { if (requestId === requestRef.current) setMapNote("Unable to reach the map services."); }
//   };

//   const mapStops = useMemo(() => stops.map((s) => ({ ...s, geo: geo[String(s.sequence)] || null })), [stops, geo]);
//   const tracking = useMemo(() => makeTrackingValues(selected, routeInfo), [selected, routeInfo]);

//   if (permissionLoading) return <LoadingState text="Loading permissions…" />;
//   if (!canView(MODULE_NAME)) return <AccessDenied />;

//   return (
//     <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
//       <div className="mx-auto max-w-[1800px] space-y-4">
//         {/* Title + LR picker */}
//         <div className="flex flex-wrap items-end justify-between gap-4">
//           <div>
//             <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Transport operations</p>
//             <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Tracking Plan</h1>
//             <p className="mt-1 text-sm text-slate-600">Read-only delivery and live-location planning for loadings.</p>
//           </div>
//           <div className="w-full sm:w-[28rem]">
//             <label htmlFor="lr-combobox" className="text-xs font-bold uppercase tracking-wide text-slate-600">Loading Info / Vehicle No</label>
//             <LoadingCombobox loadings={loadings} selectedId={selectedId} onSelect={selectLoading} loading={listLoading} disabled={detailLoading} />
//           </div>
//         </div>

//         {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
//         {detailLoading && <div aria-live="polite" className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"><Spinner />Loading tracking data…</div>}
//         {!selected && !detailLoading && <EmptyState />}

//         {selected && (
//           <>
//             <SummaryBar selected={selected} tracking={tracking} />
//             {selected._vehicleMismatch && (
//               <div role="status" className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800">
//                 LR {selected._vehicleMismatch.lrNo} was created with vehicle {selected._vehicleMismatch.lrVehicle}, but this loading has {selected._vehicleMismatch.loadingVehicle}. Tracking uses the loading's vehicle.
//               </div>
//             )}

//             <section className={`${CARD} overflow-hidden`}>
//               <SectionHeader title="Purchase & pricing" />
//               <div className="space-y-4 p-4 sm:p-5">
//                 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
//                   <ReadField label="Purchase No" value={tracking.purchaseNo} />
//                   <ReadField label="Pricing Serial No" value={tracking.pricingSerialNo} />
//                   <StatusField label="Auto Assign" value={tracking.autoAssign} tone={tracking.autoAssign === "Assigned" ? "green" : "yellow"} />
//                   <ReadField label="Branch" value={tracking.branch} />
//                   <ReadField label="Delivery" value={tracking.delivery} />
//                   <ReadField label="Date" value={tracking.date} />
//                 </div>
//                 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
//                   <ReadField label="Billing Type" value={tracking.billingType} accent="yellow" />
//                   <ReadField label="Multi - Order" value={tracking.multiOrder} accent="yellow" />
//                   <ReadField label="No. of Loading Points" value={tracking.loadingPoints} accent="green" />
//                   <ReadField label="No. of Dropping Point" value={tracking.droppingPoints} accent="green" />
//                 </div>
//                 <OrderTable rows={tracking.orderTableRows} />
//               </div>
//             </section>

//             <section className={`${CARD} overflow-hidden`}>
//               <SectionHeader title="Delivery schedule" />
//               <div className="space-y-3 p-4 sm:p-5">
//                 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
//                   <ReadField label="Start Date" value={tracking.startDate} />
//                   <ReadField label="Delivery Days" value={tracking.deliveryDays} />
//                   <ReadField label="Total Days" value={tracking.totalDays} />
//                   <ReadField label="Expected Days for Delivery" value={tracking.expectedDays} />
//                   <ReadField label="Expected Date of Delivery" value={tracking.expectedDate} />
//                   <StatusField label="E-waybill - Extension" value={tracking.ewaybillExtension} tone={tracking.ewaybillExtension === "Required" ? "yellow" : "slate"} />
//                   <ReadField label="E-wayBill Expiry - Date" value={tracking.ewaybillExpiry} />
//                   <ReadField label="Total Km - Pending" value={tracking.totalKmPending} />
//                   <ReadField label="Last - Location" value={tracking.lastLocation} />
//                   <StatusField label="Transit Status" value={tracking.transitStatus} tone="yellow" />
//                 </div>
//                 <ReadField label="Remark" value={tracking.remarks} accent="yellow" />
//               </div>
//             </section>
//             <StopsTable stops={stops} />
//             <TrackingMap stops={mapStops} route={routeInfo} fallback={<MapPlaceholder />} />
//             {mapNote && <div role="status" className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800">{mapNote}</div>}
//             <TrackingTable tracking={tracking} />
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// // One field that is both the search box and the dropdown: click it, type to filter, pick from the list.
// function LoadingCombobox({ loadings, selectedId, onSelect, loading, disabled }) {
//   const [open, setOpen] = useState(false);
//   const [query, setQuery] = useState("");
//   const [active, setActive] = useState(0);
//   const rootRef = useRef(null);
//   const labelOf = (lr) => `${lr.vehicleArrivalNo} / ${lr.vehicleNo}`;
//   const selectedLr = loadings.find((lr) => lr._id === selectedId);
//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     if (!q) return loadings;
//     return loadings.filter((lr) => [lr.vehicleArrivalNo, lr.vehicleNo, lr.date, ...(lr.orderNumbers || [])].some((v) => String(v || "").toLowerCase().includes(q)));
//   }, [loadings, query]);

//   useEffect(() => {
//     const close = (event) => { if (rootRef.current && !rootRef.current.contains(event.target)) { setOpen(false); setQuery(""); } };
//     document.addEventListener("mousedown", close);
//     return () => document.removeEventListener("mousedown", close);
//   }, []);
//   useEffect(() => { if (open) document.getElementById(`lr-opt-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, open]);

//   const choose = (lr) => { onSelect(lr._id); setOpen(false); setQuery(""); };
//   const onKeyDown = (event) => {
//     if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0))); }
//     else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
//     else if (event.key === "Enter" && open && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
//     else if (event.key === "Escape" || event.key === "Tab") { setOpen(false); setQuery(""); }
//   };

//   return (
//     <div ref={rootRef} className="relative mt-1">
//       <input
//         id="lr-combobox" type="text" role="combobox" aria-expanded={open} aria-controls="lr-listbox" aria-autocomplete="list"
//         aria-activedescendant={open && filtered[active] ? `lr-opt-${active}` : undefined}
//         autoComplete="off" disabled={disabled || loading}
//         value={open ? query : selectedLr ? labelOf(selectedLr) : ""}
//         placeholder={loading ? "Loading Loading Info…" : "Search loading no, vehicle no or order"}
//         onFocus={() => { setOpen(true); setQuery(""); setActive(0); }}
//         onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
//         onKeyDown={onKeyDown}
//         className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-16 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 disabled:bg-slate-100"
//       />
//       <div className="absolute inset-y-0 right-2 flex items-center gap-1">
//         {selectedId && !disabled && (
//           <button type="button" aria-label="Clear selected loading" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSelect(""); setQuery(""); }}
//             className="rounded-md px-1.5 text-lg leading-none text-slate-400 hover:bg-yellow-50 hover:text-slate-700">×</button>
//         )}
//         <span aria-hidden="true" className="pointer-events-none text-xs text-slate-400">▾</span>
//       </div>
//       {open && (
//         <ul id="lr-listbox" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
//           {filtered.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">No matching loading info</li>}
//           {filtered.map((lr, index) => (
//             <li key={lr._id} id={`lr-opt-${index}`} role="option" aria-selected={lr._id === selectedId}
//               onMouseDown={(e) => e.preventDefault()} onClick={() => choose(lr)} onMouseEnter={() => setActive(index)}
//               className={`cursor-pointer px-3 py-2 text-sm ${index === active ? "bg-yellow-50" : ""} ${lr._id === selectedId ? "border-l-4 border-yellow-500" : "border-l-4 border-transparent"}`}>
//               <div className="font-bold text-slate-900">{lr.vehicleArrivalNo} / {lr.vehicleNo}</div>
//               <div className="truncate text-xs text-slate-500">{[lr.date, (lr.orderNumbers || []).join(", ")].filter(Boolean).join(" • ") || "Loading Info"}</div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

// // Builds an LR-shaped object from the loading, with LR values winning where an LR exists.
// // This keeps makeTrackingValues() and SummaryBar working unchanged.
// function buildSelected(loading, lrList = []) {
//   const lr = lrList[0] || null;
//   const rows = loading?.orderRows || [];
//   const row = rows[0] || {};
//   const lrHeader = lr?.header || {};
//   const toNames = [...new Set(rows.map((r) => r.toName || r.to).filter(Boolean))].join(", ");
//   const orderNos = [...new Set(rows.map((r) => r.orderNo).filter(Boolean))];
//   const plantLabel = (r) => r?.plantCodeValue ? `${r.plantName || ""} (${r.plantCodeValue})` : (r?.plantName || "");
//   return {
//     ...(lr || {}),
//     _hasLr: Boolean(lr),
//     _lrNos: lrList.map((x) => x.lrNo).filter(Boolean),
//     _vehicleMismatch: vehicleMismatch(lrList, loading),
//     _rows: rows,
//     loadingInfoNo: loading?.vehicleArrivalNo,
//     vnnNo: lr?.vnnNo || loading?.selectedVehicleNegotiation?.vnnNo || loading?.vehicleNegotiationNo || "",
//     subCompanyName: lr?.subCompanyName || loading?.subCompanyName,
//     subCompanyCode: lr?.subCompanyCode || loading?.subCompanyCode,
//     deliveryType: loading?.delivery,
//     billingType: loading?.billingType,
//     noOfLoadingPoints: loading?.noOfLoadingPoints,
//     noOfDroppingPoint: loading?.noOfDroppingPoint,
//     totalWeight: loading?.totalWeight ?? lr?.totalWeight,
//     createdAt: loading?.date,
//     header: {
//       ...lrHeader,
//       lrDate: lrHeader.lrDate || loading?.date || "",
//       orderNo: lrHeader.orderNo || orderNos.join(", "),
//       partyName: lrHeader.partyName || row.partyName,
//       plantCode: lrHeader.plantCode || plantLabel(row),
//       plantName: lrHeader.plantName || row.plantName,
//       orderType: lrHeader.orderType || row.orderType,
//       pinCode: row.pinCode,
//       state: lrHeader.state || row.stateName || row.state,
//       district: lrHeader.district || row.districtName || row.district,
//       from: lrHeader.from || row.fromName || row.from,
//       to: toNames || lrHeader.to,
//       vehicleNo: loading?.vehicleInfo?.vehicleNo || lrHeader.vehicleNo,
//     },
//   };
// }
// const norm = (v) => String(v ?? "").trim().toLowerCase();
// // Joins address parts, skipping blanks and repeats (a town and its taluka can share a name).
// const joinText = (parts) => [...new Map(parts.map((p) => String(p ?? "").trim()).filter(Boolean).map((p) => [p.toLowerCase(), p])).values()].join(", ");
// const plate = (v) => String(v ?? "").replace(/\s+/g, "").toUpperCase();
// const pinFromText = (text) => (String(text || "").match(/\b\d{6}\b/g) || []).pop() || "";

// // The LR form can carry a different truck than the loading (it is filled from the vehicle negotiation).
// function vehicleMismatch(lrList, loading) {
//   const loadingVehicle = loading?.vehicleInfo?.vehicleNo;
//   const lr = lrList.find((l) => plate(l.header?.vehicleNo) && plate(loadingVehicle) && plate(l.header.vehicleNo) !== plate(loadingVehicle));
//   return lr ? { lrNo: lr.lrNo, lrVehicle: lr.header.vehicleNo, loadingVehicle } : null;
// }

// // Which LR covers this order row? An LR linked to a row (orderRowId) covers only that row.
// // Otherwise it is a whole-loading LR (one LR per loading) and covers every row of its order.
// function lrForRow(row, lrList) {
//   const byRowId = lrList.find((l) => l.orderRowId && String(l.orderRowId) === String(row._id));
//   if (byRowId) return byRowId;
//   return lrList.find((l) => !l.orderRowId && norm(l.header?.orderNo) === norm(row.orderNo)) || null;
// }

// // One pickup per distinct origin and one drop per order row, each labelled with where its address came from.
// function buildStops(loading, lrList = [], master = { matches: {}, unmatched: {} }) {
//   const rows = loading?.orderRows || [];
//   const plantLabel = (r) => (r.plantCodeValue ? `${r.plantName || ""} (${r.plantCodeValue})` : r.plantName || "");
//   const consignorLr = lrList.find((l) => String(l.consignor?.address || "").trim());
//   const pickups = new Map();
//   for (const r of rows) {
//     const key = r.plantCodeValue || r.plantName || r.fromName || r.from || "origin";
//     const entry = pickups.get(key) || { row: r, weight: 0 };
//     entry.weight += Number(r.weight) || 0;
//     pickups.set(key, entry);
//   }
//   const stops = [];
//   for (const { row, weight } of pickups.values()) {
//     const lrText = String(consignorLr?.consignor?.address || "").trim();
//     stops.push({
//       type: "pickup", orderNo: row.orderNo, partyName: consignorLr?.consignor?.name || row.partyName, weight: `${weight} MT`,
//       address: { text: lrText || joinText([plantLabel(row), row.fromName || row.from]) },
//       place: { pin: lrText ? pinFromText(lrText) : "" },
//       lrNo: lrText ? consignorLr.lrNo : "", addressSource: lrText ? "lr" : "approximate",
//       needsReview: !lrText, reason: lrText ? "" : "Plant location only; LR has no consignor address",
//     });
//   }
//   for (const row of rows) {
//     const lr = lrForRow(row, lrList);
//     // A whole-loading LR has one consignee, which belongs to the LR's own destination only.
//     const ownsConsignee = lr && (lr.orderRowId || norm(lr.header?.to) === norm(row.toName || row.to));
//     const consigneeText = String(lr?.consignee?.address || "").trim();
//     const text = ownsConsignee ? consigneeText : "";
//     const fromMaster = text ? null : master.matches?.[String(row._id)] || null;
//     const masterNote = master.unmatched?.[String(row._id)] || "";
//     const place = joinText([row.toName || row.to, row.talukaName || row.taluka, row.districtName || row.district, row.stateName || row.state]);
//     stops.push({
//       type: "drop", orderNo: row.orderNo, partyName: text ? lr.consignee.name || row.partyName : row.partyName,
//       weight: `${row.weight || 0} MT`, lrNo: lr?.lrNo || "",
//       address: { text: text || fromMaster?.text || joinText([place, row.pinCode]), title: text ? lr.consignee.selectedAddressTitle : fromMaster?.title || "" },
//       place: { city: row.toName || row.to, pin: text ? pinFromText(text) || row.pinCode : fromMaster?.pin || row.pinCode },
//       addressSource: text ? "lr" : fromMaster ? "customer-master" : "approximate", needsReview: !text && !fromMaster,
//       reason: text || fromMaster ? "" : [
//         !lr ? "No LR for this drop yet"
//           : !consigneeText ? `${lr.lrNo} has no consignee address yet`
//             : `${lr.lrNo} consignee address is for ${lr.header?.to || "its own destination"} only`,
//         masterNote,
//       ].filter(Boolean).join(". "),
//     });
//   }
//   return stops.map((s, i) => ({ sequence: i + 1, ...s }));
// }

// // routeInfo (optional) comes from /api/tracking/route and fills the distance and expected-delivery fields.
// function makeTrackingValues(selected, routeInfo = null) {
//   const header = selected?.header || {}, ewaybill = selected?.ewaybill || {};
//   const startDate = header.lrDate || selected?.createdAt || "";
//   const orderCells = [header.orderNo, header.partyName, header.plantCode || header.plantName, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.state, header.district, header.from, header.to, `${selected?.totalWeight || 0} ${header.unit || "MT"}`, selected?.rate, selected?.totalAmount];
//   const rowsSource = selected?._rows?.length ? selected._rows : [];
//   const plantText = (r) => r.plantCodeValue ? `${r.plantName || ""} (${r.plantCodeValue})` : (r.plantName || "");
//   const orderTableRows = rowsSource.length
//     ? rowsSource.map((r) => [
//       r.orderNo, r.partyName, plantText(r), r.orderType, r.pinCode,
//       r.stateName || r.state, r.districtName || r.district, r.fromName || r.from, r.toName || r.to,
//       `${r.weight || 0} ${header.unit || "MT"}`,
//       r.orderNo === header.orderNo ? selected?.rate : undefined,
//       r.orderNo === header.orderNo ? selected?.totalAmount : undefined,
//     ])
//     : [orderCells];
//   const values = { purchaseNo: selected?.vnnNo || header.orderNo, pricingSerialNo: selected?.loadingInfoNo, autoAssign: header.vehicleNo ? "Assigned" : "Not Assigned", branch: selected?.subCompanyName || selected?.subCompanyCode, delivery: selected?.deliveryType || "Normal", date: formatDate(startDate), billingType: selected?.billingType || selected?.lcStatus || header.lcStatus || dash, multiOrder: header.orderNo, loadingPoints: String(selected?.noOfLoadingPoints || 1), droppingPoints: String(selected?.noOfDroppingPoint || 1), orderCells, orderTableRows, startDate: formatDate(startDate), deliveryDays: dash, totalDays: dash, expectedDays: routeInfo ? `${routeInfo.plan.expectedDays} day${routeInfo.plan.expectedDays === 1 ? "" : "s"}` : dash, expectedDate: routeInfo ? formatDate(routeInfo.plan.expectedDate) : dash, ewaybillExtension: ewaybill.ewaybillNo ? "Required" : "Not Required", ewaybillExpiry: formatDate(ewaybill.expiryDate), totalKmPending: routeInfo ? `${routeInfo.distanceKm} km` : dash, lastLocation: dash, transitStatus: "Awaiting live location", remarks: selected?.remarks || header.remarks };
//   return { ...values, panelHeaders: ["Date", "Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "From", "To", "District", "State", "Weight", "Start Date", "Delivery Days", "Total Days", "E-wayBill Expiry - Date", "Total Km - Pending", "Last Location", "Expected Days for Delivery", "E-waybill - Extension", "Tracking Status"], panelValues: [values.date, header.orderNo, header.partyName, header.plantCode || header.plantName, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.from, header.to, header.district, header.state, `${selected?.totalWeight || 0} ${header.unit || "MT"}`, values.startDate, values.deliveryDays, values.totalDays, values.ewaybillExpiry, values.totalKmPending, values.lastLocation, values.expectedDays, values.ewaybillExtension, values.transitStatus] };
// }

// const CHIP_TONES = {
//   green: "border-emerald-200 bg-emerald-100 text-emerald-800",
//   yellow: "border-yellow-300 bg-yellow-100 text-yellow-800",
//   slate: "border-slate-200 bg-slate-100 text-slate-700",
// };
// function Chip({ tone = "slate", children }) {
//   return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${CHIP_TONES[tone]}`}>{children}</span>;
// }
// function Spinner() {
//   return <span className="inline-block h-5 w-5 animate-spin rounded-full border-b-2 border-yellow-500" aria-hidden="true" />;
// }
// function SectionHeader({ title, right }) {
//   return (
//     <div className="flex items-center justify-between gap-3 border-b border-yellow-500 bg-yellow-400 px-4 py-2.5">
//       <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">{title}</h2>
//       {right}
//     </div>
//   );
// }
// function SummaryBar({ selected, tracking }) {
//   const header = selected?.header || {};
//   return (
//     <section className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 shadow-sm">
//       <div className="flex flex-wrap items-center justify-between gap-3">
//         <div className="min-w-0">
//           <p className="text-[11px] font-bold uppercase tracking-wide text-yellow-700">Loading Info</p>
//           <p className="truncate text-lg font-extrabold text-slate-900">{valueOf(selected?.loadingInfoNo)}</p>
//           <p className="truncate text-sm text-slate-600">{valueOf(header.partyName)} • {selected?._lrNos?.length ? `LR ${selected._lrNos.join(", ")}` : "LR not created yet"}</p>
//         </div>
//         <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
//           <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Route</p><p className="font-semibold text-slate-900">{valueOf(header.from)} → {valueOf(header.to)}</p></div>
//           <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Vehicle</p><p className="font-semibold text-slate-900">{valueOf(header.vehicleNo)}</p></div>
//           <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Weight</p><p className="font-semibold text-slate-900">{`${selected?.totalWeight || 0} ${header.unit || "MT"}`}</p></div>
//         </div>
//         <div className="flex flex-wrap gap-2">
//           <Chip tone={tracking.autoAssign === "Assigned" ? "green" : "yellow"}>{tracking.autoAssign}</Chip>
//           <Chip tone="yellow">{tracking.transitStatus}</Chip>
//         </div>
//       </div>
//     </section>
//   );
// }
// function ReadField({ label, value, accent }) {
//   const tone = accent === "yellow" ? "border-yellow-300 bg-yellow-50" : accent === "green" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50";
//   return (
//     <div className={`rounded-lg border px-3 py-2 ${tone}`}>
//       <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
//       <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">{valueOf(value)}</div>
//     </div>
//   );
// }
// function StatusField({ label, value, tone }) {
//   return (
//     <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
//       <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
//       <div className="mt-1"><Chip tone={tone}>{valueOf(value)}</Chip></div>
//     </div>
//   );
// }
// function OrderTable({ rows }) {
//   const heads = ["Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "State", "District", "From", "To", "Weight", "Rate", "Total Amount"];
//   return (
//     <div className="overflow-x-auto rounded-xl border border-slate-200">
//       <table className="w-full min-w-[1050px] text-left text-xs">
//         <thead className="bg-yellow-100 text-slate-900">
//           <tr>{heads.map((head) => <th key={head} className="whitespace-nowrap border-b border-yellow-300 px-3 py-2 font-bold">{head}</th>)}</tr>
//         </thead>
//         <tbody>
//           {rows.map((cells, rowIndex) => (
//             <tr key={rowIndex} className="text-slate-700 hover:bg-yellow-50">
//               {cells.map((cell, index) => <td key={index} className="whitespace-nowrap px-3 py-2.5">{valueOf(cell)}</td>)}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
// function MapPlaceholder() {
//   return (
//     <section className={`${CARD} overflow-hidden`}>
//       <SectionHeader title="Live location tracking" right={<Chip tone="slate">Not configured</Chip>} />
//       <div className="flex min-h-64 flex-col items-center justify-center bg-[linear-gradient(135deg,#fefce8_25%,#ffffff_25%,#ffffff_50%,#fefce8_50%,#fefce8_75%,#ffffff_75%)] bg-[length:32px_32px] p-6 text-center">
//         <div className="rounded-full border border-yellow-300 bg-yellow-100 p-4 text-3xl text-yellow-700">⌖</div>
//         <h3 className="mt-3 text-lg font-bold text-slate-900">Google Maps tracking placeholder</h3>
//         <p className="mt-1 max-w-2xl text-sm text-slate-600">Location, remaining distance, route duration, ETA and actual-delivery values will appear here once Google Maps and approved driver-location integration are configured. No Google request is made until then.</p>
//       </div>
//     </section>
//   );
// }
// function TrackingTable({ tracking }) {
//   return (
//     <section className={`${CARD} overflow-hidden`}>
//       <SectionHeader title="Tracking - Panel" />
//       <div className="overflow-x-auto">
//         <table className="w-full min-w-[1900px] text-left text-xs">
//           <thead className="bg-yellow-100 text-slate-900">
//             <tr>{tracking.panelHeaders.map((head, i) => <th key={head} className={`whitespace-nowrap border-b border-yellow-300 px-3 py-2 font-bold ${i === 0 ? "sticky left-0 bg-yellow-100" : ""}`}>{head}</th>)}</tr>
//           </thead>
//           <tbody>
//             <tr className="text-slate-700 hover:bg-yellow-50">{tracking.panelValues.map((cell, index) => <td key={index} className={`whitespace-nowrap px-3 py-2.5 ${index === 0 ? "sticky left-0 bg-white font-semibold" : ""}`}>{valueOf(cell)}</td>)}</tr>
//           </tbody>
//         </table>
//       </div>
//     </section>
//   );
// }
// function LoadingState({ text }) {
//   return <div className="flex min-h-screen items-center justify-center gap-3 bg-slate-50 text-sm text-slate-600"><Spinner />{text}</div>;
// }
// function EmptyState() {
//   return (
//     <div className="rounded-xl border border-dashed border-yellow-300 bg-white px-6 py-16 text-center">
//       <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-2xl text-yellow-700">⌖</div>
//       <p className="text-sm font-semibold text-slate-800">No loading selected</p>
//       <p className="mt-1 text-sm text-slate-500">Search or pick a Loading Info above to load its read-only Tracking Plan.</p>
//     </div>
//   );
// }
// function AccessDenied() {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
//       <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
//         <h1 className="text-xl font-bold text-slate-900">Access denied</h1>
//         <p className="mt-2 text-sm text-slate-600">You do not have permission to access Tracking Plan.</p>
//         <Link href="/admin" className="mt-5 inline-block rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-yellow-700">Return to dashboard</Link>
//       </div>
//     </div>
//   );
// }
// function StopsTable({ stops }) {
//   if (!stops.length) return null;
//   const tone = (s) => (s.needsReview || s.addressSource === "approximate") ? "yellow" : "green";
//   const label = { lr: "From LR", "customer-master": "Customer master", approximate: "Approximate" };
//   return (
//     <section className={`${CARD} overflow-hidden`}>
//       <SectionHeader title="Stops" />
//       <div className="overflow-x-auto">
//         <table className="w-full min-w-[1000px] text-left text-xs">
//           <thead className="bg-yellow-100 text-slate-900">
//             <tr>{["#", "Type", "Order", "Party", "Address", "Pin", "Weight", "LR", "Source"].map((h) => <th key={h} className="whitespace-nowrap border-b border-yellow-300 px-3 py-2 font-bold">{h}</th>)}</tr>
//           </thead>
//           <tbody>
//             {stops.map((s) => (
//               <tr key={s.sequence} className="align-top text-slate-700 hover:bg-yellow-50">
//                 <td className="px-3 py-2.5">{s.sequence}</td>
//                 <td className="px-3 py-2.5 font-semibold">{s.type === "pickup" ? "Pickup" : "Drop"}</td>
//                 <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.orderNo)}</td>
//                 <td className="min-w-[10rem] px-3 py-2.5">
//                   {valueOf(s.partyName || s.label)}
//                   {s.addressSource === "lr" && <div className="text-[11px] text-slate-500">{s.type === "pickup" ? "Consignor" : "Consignee"}</div>}
//                 </td>
//                 <td className="min-w-[24rem] whitespace-normal px-3 py-2.5">
//                   {valueOf(s.address?.text || s.place?.city)}
//                   {s.address?.title ? <div className="text-[11px] text-slate-500">{s.address.title}</div> : null}
//                 </td>
//                 <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.place?.pin)}</td>
//                 <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.weight)}</td>
//                 <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.lrNo)}</td>
//                 <td className="px-3 py-2.5">
//                   <Chip tone={tone(s)}>{label[s.addressSource]}</Chip>
//                   {s.needsReview && s.reason ? <div className="mt-1 text-[11px] text-slate-500">{s.reason}</div> : null}
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </section>
//   );
// }


"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MapPin, Radio, Search, Truck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePermission } from "../hooks/usePermission";
import TrackingMap from "@/app/api/tracking/TrackingMap";

const MODULE_NAME = "Tracking Plan";
const dash = "—";
const valueOf = (value) => (value === 0 ? "0" : value || dash);
const formatDate = (value) => {
  if (!value) return dash;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB").format(date);
};

// Same yellow scale the rest of the project uses:
// headers bg-yellow-400 + border-yellow-500, soft fills yellow-50/100, borders yellow-300,
// focus ring yellow-200, primary buttons bg-yellow-600 hover:bg-yellow-700.
const CARD = "rounded-xl border border-slate-200 bg-white shadow-sm";

export default function TrackingPlanPage() {
  const { canView, canEdit, loading: permissionLoading } = usePermission();
  const [loadings, setLoadings] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [stops, setStops] = useState([]);
  const [geo, setGeo] = useState({});               // stop sequence -> { lat, lng, accuracy }
  const [routeInfo, setRouteInfo] = useState(null); // { distanceKm, plan, ... } from /api/tracking/route
  const [mapNote, setMapNote] = useState("");
  const [liveTracking, setLiveTracking] = useState(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [driverRoute, setDriverRoute] = useState(null);
  const [trail, setTrail] = useState(null);
  const etaRequestRef = useRef({ key: "", at: 0 });
  const mapCacheRef = useRef(new Map());              // address signature -> { at, located, routeInfo }, this tab only
  const requestRef = useRef(0);                      // ignores answers for a loading the user has already left
  const liveRequestRef = useRef(0);
  const initialLoadingHandled = useRef(false);

  useEffect(() => {
    if (permissionLoading || !canView(MODULE_NAME)) return;
    let active = true;
    const loadLrs = async () => {
      setListLoading(true); setError("");
      try {
        const response = await fetch("/api/loading-panel?format=table", { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.message || "Unable to load Loading Info.");
        if (active) setLoadings(data.data || []);
      } catch (requestError) { if (active) setError(requestError.message || "Unable to load Loading Info."); }
      finally { if (active) setListLoading(false); }
    };
    loadLrs();
    return () => { active = false; };
  }, [permissionLoading, canView]);

  const loadLiveTracking = async (id, headers, requestId = requestRef.current) => {
    if (!id) return;
    const liveRequest = ++liveRequestRef.current;
    const isCurrent = () => requestId === requestRef.current && liveRequest === liveRequestRef.current;
    try {
      const response = await fetch(`/api/mobile/v1/admin/live-tracking?loadingId=${encodeURIComponent(id)}`, { headers, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load the driver's live status.");
      if (isCurrent()) { setLiveTracking(data.data); setLiveError(""); }
    } catch (requestError) {
      if (isCurrent()) setLiveError(requestError.message || "Unable to load live tracking.");
    }
  };
  const refreshLiveTracking = async () => {
    const requestId = requestRef.current;
    setLiveLoading(true);
    try {
      await loadLiveTracking(selectedId, { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, requestId);
    } finally {
      if (requestId === requestRef.current) setLiveLoading(false);
    }
  };
  const approveRouteBaseline = async (tripId) => {
    if (!routeInfo) { setLiveError("Wait for the GPS pickup and the route to the delivery stops before saving the ETA reference."); return; }
    setLiveLoading(true); setLiveError("");
    try {
      const response = await fetch(`/api/mobile/v1/admin/trips/${tripId}/route-baseline`, {
        method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ distanceKm: routeInfo.distanceKm, durationMinutes: routeInfo.durationMinutes, expectedDays: routeInfo.plan?.expectedDays || 1 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to approve route baseline.");
      setMapNote("Planned route saved for ETA. A live estimate appears when recent, usable GPS and a route to the remaining drops are available.");
      await loadLiveTracking(selectedId, { Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
    } catch (requestError) { setLiveError(requestError.message || "Unable to approve route baseline."); }
    finally { setLiveLoading(false); }
  };

  const selectLoading = async (id) => {
    const requestId = ++requestRef.current;
    setSelectedId(id); setSelected(null); setError(""); setStops([]); setGeo({}); setRouteInfo(null); setMapNote(""); setLiveTracking(null); setLiveError("");
    setDriverRoute(null);
    setTrail(null);
    setLiveLoading(false);
    etaRequestRef.current = { key: "", at: 0 };
    if (!id) { setDetailLoading(false); return; }
    setDetailLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };

      // 1) The loading is the source of truth
      const lpRes = await fetch(`/api/loading-panel?id=${encodeURIComponent(id)}`, { headers });
      const lpData = await lpRes.json().catch(() => ({}));
      if (!lpRes.ok || !lpData.success) throw new Error(lpData.message || "Unable to load the selected Loading Info.");

      // 2) LRs are optional (none may exist yet). The API returns one LR today; a list is accepted too.
      const lrRes = await fetch(`/api/consignment-note?loadingInfoNo=${encodeURIComponent(lpData.data.vehicleArrivalNo)}`, { headers });
      const lrData = await lrRes.json().catch(() => ({}));
      const lrList = lrRes.ok && lrData.success ? [].concat(lrData.data || []) : [];

      if (requestId !== requestRef.current) return;
      setSelected(buildSelected(lpData.data, lrList));
      // Customer-master addresses are an extra: a failure here must not break the page.
      let master = { matches: {}, unmatched: {} };
      try {
        const stRes = await fetch(`/api/tracking/stops?loadingId=${encodeURIComponent(id)}`, { headers });
        const stData = await stRes.json().catch(() => ({}));
        if (stRes.ok && stData.success) master = { matches: stData.data.matches || {}, unmatched: stData.data.unmatched || {} };
      } catch { /* keep the approximate addresses */ }
      if (requestId !== requestRef.current) return;
      const built = buildStops(lpData.data, lrList, master);
      setStops(built);
      locateStops(built, headers, requestId); // map and route load after the page is already usable
      loadLiveTracking(id, headers, requestId); // live mobile telemetry is optional and never blocks ERP data
    } catch (requestError) { if (requestId === requestRef.current) setError(requestError.message || "Unable to load the selected Loading Info."); }
    finally { if (requestId === requestRef.current) setDetailLoading(false); }
  };

  // Refresh the staff map without reloading the Loading Info, LR, or route plan.
  useEffect(() => {
    if (!loadings.length || initialLoadingHandled.current) return;
    initialLoadingHandled.current = true;
    const loadingId = new URLSearchParams(window.location.search).get("loadingId");
    if (loadingId && loadings.some((row) => String(row._id) === loadingId)) selectLoading(loadingId);
  }, [loadings]);

  useEffect(() => {
    if (!selectedId || !selected) return undefined;
    const requestId = requestRef.current;
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadLiveTracking(selectedId, { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, requestId);
      }
    };
    const timer = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [selectedId, selected]);
  // Locate delivery stops. The pickup comes from the driver's GPS.
  const locateStops = async (list, headers, requestId) => {
    if (!list.length) return;
    const cacheKey = list.map((s) => `${s.type}:${s.address?.text || ""}|${s.place?.city || ""}|${s.place?.pin || ""}`).join("~");
    const hit = mapCacheRef.current.get(cacheKey);
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) { setGeo(hit.located); if (hit.note) setMapNote(hit.note); return; }
    const post = async (url, body) => {
      const res = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return { res, data: await res.json().catch(() => ({})) };
    };
    try {
      const { res, data } = await post("/api/tracking/geocode", {
        stops: list.map((s) => ({ key: String(s.sequence), text: s.address?.text, city: s.place?.city, pin: s.place?.pin })),
      });
      if (requestId !== requestRef.current) return;
      if (!res.ok || !data.success) {
        setMapNote(data.code === "NOT_CONFIGURED" ? "Route planning is off: ROUTES_API_KEY is not set in .env.local." : data.message || "Unable to locate the stops.");
        return;
      }
      const located = {};
      for (const [key, r] of Object.entries(data.data.results || {})) if (r.status === "ok") located[key] = { lat: r.lat, lng: r.lng, accuracy: r.accuracy };
      setGeo(located);
      if (data.data.warning) setMapNote(data.data.warning);

      if (!data.data.warning) mapCacheRef.current.set(cacheKey, { at: Date.now(), located });
    } catch { if (requestId === requestRef.current) setMapNote("Unable to reach the map services."); }
  };

  const mapStops = useMemo(() => stops.map((s) => ({ ...s, geo: geo[String(s.sequence)] || null })), [stops, geo]);
  const liveTrips = liveTracking?.trips || [];
  const primaryLiveTrip = liveTrips.find((trip) => trip.session?.status === "active")
    || liveTrips.find((trip) => trip.session?.status === "stale")
    || liveTrips.find((trip) => !["completed", "cancelled"].includes(trip.tripState))
    || liveTrips.find((trip) => trip.latestLocation)
    || liveTrips[0] || null;
  const liveVehicle = primaryLiveTrip?.latestLocation ? {
    lat: primaryLiveTrip.latestLocation.latitude, lng: primaryLiveTrip.latestLocation.longitude,
    label: `${primaryLiveTrip.vehicleNo || "Vehicle"} · ${primaryLiveTrip.driver?.displayName || "Driver"}`,
  } : null;
  const pickupLat = primaryLiveTrip?.actualPickup?.latitude;
  const pickupLng = primaryLiveTrip?.actualPickup?.longitude;
  const pickupRecordedAt = primaryLiveTrip?.actualPickup?.recordedAt;
  const driverStart = pickupRecordedAt ? { lat: pickupLat, lng: pickupLng, recordedAt: pickupRecordedAt } : null;
  useEffect(() => {
    setRouteInfo(null);
    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng) || !mapStops.length || mapStops.some((stop) => !stop.geo)) return;
    const controller = new AbortController();
    const loadPickupRoute = async () => {
      const response = await fetch("/api/tracking/route", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ origin: { lat: pickupLat, lng: pickupLng }, stops: mapStops.map(({ geo: { lat, lng } }) => ({ lat, lng })) }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (response.ok && result.success && !controller.signal.aborted) setRouteInfo(result.data);
    };
    loadPickupRoute().catch(() => {});
    return () => controller.abort();
  }, [pickupLat, pickupLng, mapStops]);
  const liveMapStatus = primaryLiveTrip?.session ? `GPS ${liveError ? "last known" : formatLiveStatus(primaryLiveTrip.session.status)}${primaryLiveTrip.session.lastRecordedAt ? ` · ${relativeTime(primaryLiveTrip.session.lastRecordedAt)}` : ""}` : "No active driver tracking";
  const remaining = primaryLiveTrip?.remainingStops || [];
  const routingStops = remaining;
  const estimateKey = `${primaryLiveTrip?.tripId || ""}:${routingStops.map((stop) => `${stop.sequence}:${stop.address}:${stop.city}:${stop.pinCode}`).join("|")}`;
  const trustedPoint = primaryLiveTrip?.latestLocation;
  const startedTrip = primaryLiveTrip && !["assigned", "completed", "cancelled"].includes(primaryLiveTrip.tripState);
  const driverRouteMode = Boolean(startedTrip && trustedPoint);
  const canRouteFromDriver = driverRouteMode && !trustedPoint.isMocked && trustedPoint.accuracyM <= 100 && routingStops.length > 0;
  const canEstimate = canRouteFromDriver && !liveError && primaryLiveTrip?.session?.status === "active"
    && primaryLiveTrip?.eta?.status === "available";

  useEffect(() => {
    if (!canRouteFromDriver) return;
    const previous = etaRequestRef.current;
    const phase = primaryLiveTrip.tripState;
    if (previous.key === estimateKey && previous.phase === phase) {
      if (Date.now() - previous.at < 60000) return;
      if (!previous.failed && previous.recordedAt === trustedPoint.recordedAt) return;
    }
    const attempt = { key: estimateKey, phase, at: Date.now(), recordedAt: trustedPoint.recordedAt };
    etaRequestRef.current = attempt;
    const post = async (path, body) => {
      const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      return result.data;
    };
    const estimate = async () => {
      const located = await post("/api/tracking/geocode", { stops: routingStops.map((stop) => ({ key: String(stop.sequence), text: stop.address, city: stop.city, pin: stop.pinCode })) });
      const points = routingStops.map((stop) => located.results?.[String(stop.sequence)]);
      if (points.some((point) => point?.status !== "ok")) throw new Error("Unable to locate every remaining stop.");
      const route = await post("/api/tracking/route", {
        origin: { lat: trustedPoint.latitude, lng: trustedPoint.longitude },
        stops: points.map(({ lat, lng }) => ({ lat, lng })),
      });
      if (etaRequestRef.current !== attempt) return;
      const at = Date.now();
      const drivingMs = route.totalSeconds * route.plan.assumptions.TRUCK_TIME_FACTOR * 1000;
      setDriverRoute({ key: estimateKey, route: { ...route, driverOrigin: true }, recordedAt: trustedPoint.recordedAt, at, arrival: at + drivingMs });
    };
    estimate().catch(() => {
      if (etaRequestRef.current === attempt) etaRequestRef.current = { ...attempt, failed: true };
    });
  }, [canRouteFromDriver, estimateKey, liveTracking]);

  const currentDriverRoute = canRouteFromDriver && driverRoute?.key === estimateKey ? driverRoute : null;
  const currentEstimate = canEstimate && currentDriverRoute && Date.now() - new Date(currentDriverRoute.recordedAt).getTime() <= liveTracking.staleAfterSeconds * 1000
    ? currentDriverRoute : null;
  const mapRoute = driverRouteMode ? currentDriverRoute?.route || null : routeInfo;
  const tracking = makeTrackingValues(selected, mapRoute, primaryLiveTrip, liveError);
  const mapRouteLabel = driverRouteMode
    ? currentDriverRoute ? `Route from driver GPS recorded ${relativeTime(currentDriverRoute.recordedAt)}`
      : routingStops.length === 0 ? "No remaining delivery route" : "Driver route unavailable. Last recorded position is shown."
    : driverStart ? "Route from recorded pickup" : "Waiting for the driver’s first GPS fix at pickup";
  const trailSelection = requestRef.current;

  if (permissionLoading) return <LoadingState text="Loading permissions…" />;
  if (!canView(MODULE_NAME)) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-800 px-4 py-4 text-white shadow-sm sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-yellow-400 text-slate-950"><MapPin size={22} aria-hidden="true" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-300">Transport operations</p>
              <h1 className="text-2xl font-extrabold">Tracking Plan</h1>
              <p className="mt-0.5 text-sm text-slate-300">Monitor vehicle locations and delivery progress.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedId && <button type="button" onClick={() => selectLoading("")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm font-bold hover:bg-slate-700"><ArrowLeft size={15} aria-hidden="true" /> Back to loadings</button>}
            <Link href="/admin/Driver-Mobile" className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-yellow-300">Driver Operations <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {detailLoading && <div aria-live="polite" className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"><Spinner />Loading tracking data…</div>}
        <LoadingTrackingList loadings={loadings} visible={!selectedId} loading={listLoading} onSelect={selectLoading} />

        {selected && (
          <>
            <SummaryBar selected={selected} tracking={tracking} />
            {selected._vehicleMismatch && (
              <div role="status" className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800">
                LR {selected._vehicleMismatch.lrNo} was created with vehicle {selected._vehicleMismatch.lrVehicle}, but this loading has {selected._vehicleMismatch.loadingVehicle}. Tracking uses the loading's vehicle.
              </div>
            )}

            <section className={`${CARD} overflow-hidden`}>
              <SectionHeader title="Purchase & pricing" />
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <ReadField label="Purchase No" value={tracking.purchaseNo} />
                  <ReadField label="Pricing Serial No" value={tracking.pricingSerialNo} />
                  <StatusField label="Auto Assign" value={tracking.autoAssign} tone={tracking.autoAssign === "Assigned" ? "green" : "yellow"} />
                  <ReadField label="Branch" value={tracking.branch} />
                  <ReadField label="Delivery" value={tracking.delivery} />
                  <ReadField label="Date" value={tracking.date} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ReadField label="Billing Type" value={tracking.billingType} accent="yellow" />
                  <ReadField label="Multi - Order" value={tracking.multiOrder} accent="yellow" />
                  <ReadField label="No. of Loading Points" value={tracking.loadingPoints} accent="green" />
                  <ReadField label="No. of Dropping Point" value={tracking.droppingPoints} accent="green" />
                </div>
                <OrderTable rows={tracking.orderTableRows} />
              </div>
            </section>

            <section className={`${CARD} overflow-hidden`}>
              <SectionHeader title="Delivery schedule" />
              <div className="space-y-3 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  <ReadField label="Start Date" value={tracking.startDate} />
                  <ReadField label="Delivery Days" value={tracking.deliveryDays} />
                  <ReadField label="Total Days" value={tracking.totalDays} />
                  <ReadField label="Expected Days for Delivery" value={tracking.expectedDays} />
                  <ReadField label="Expected Date of Delivery" value={tracking.expectedDate} />
                  <StatusField label="E-waybill - Extension" value={tracking.ewaybillExtension} tone={tracking.ewaybillExtension === "Required" ? "yellow" : "slate"} />
                  <ReadField label="E-wayBill Expiry - Date" value={tracking.ewaybillExpiry} />
                  <ReadField label="Total Km - Pending" value={tracking.totalKmPending} />
                  <ReadField label="Last - Location" value={tracking.lastLocation} />
                  <StatusField label="Transit Status" value={tracking.transitStatus} tone="yellow" />
                </div>
                <ReadField label="Remark" value={tracking.remarks} accent="yellow" />
              </div>
            </section>
            <StopsTable stops={stops} />
            <LiveTrackingPanel key={`live-status-${selectedId}`} loadingId={selectedId} loadingReference={selected.loadingInfoNo} vehicleNo={selected.header?.vehicleNo} loadingDriver={selected.loadingDriver} data={liveTracking} loading={liveLoading} error={liveError} routeInfo={routeInfo} editable={canEdit(MODULE_NAME)} onApproveBaseline={approveRouteBaseline} onRefresh={refreshLiveTracking} />
            {currentEstimate && <div className={`${CARD} p-4 text-sm`}><strong>Live route estimate</strong> · {currentEstimate.route.distanceKm} km remaining · {new Date(currentEstimate.arrival).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST based on driving time · Updated {relativeTime(currentEstimate.at)}</div>}
            {liveTrips.length > 0 && <TrailPicker key={`gps-history-${selectedId}`} loadingId={selectedId} trips={liveTrips} onTrail={(points) => {
              if (trailSelection === requestRef.current) setTrail(points);
            }} />}
            <TrackingMap stops={mapStops} vehicle={liveVehicle} driverStart={driverStart} status={liveMapStatus} route={mapRoute} routeLabel={mapRouteLabel} connectStops={false} trail={trail} fallback={<MapPlaceholder />} />
            {mapNote && <div role="status" className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800">{mapNote}</div>}
            <TrackingTable tracking={tracking} />
          </>
        )}
      </div>
    </div>
  );
}

function TrailPicker({ loadingId, trips, onTrail }) {
  const [tripId, setTripId] = useState("");
  const [range, setRange] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const trip = trips.find((item) => item.tripId === tripId) || trips[0];
  const lastGps = new Date(trip.session?.lastRecordedAt || trip.latestLocation?.recordedAt || trip.driverStart?.recordedAt);
  const hasGps = Number.isFinite(lastGps.getTime());
  const localInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const from = range?.from ?? (hasGps ? localInput(new Date(lastGps.getTime() - 60 * 60000)) : "");
  const to = range?.to ?? (hasGps ? localInput(new Date(lastGps.getTime() + 60000)) : "");

  const load = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice("");
    onTrail(null);
    try {
      const params = new URLSearchParams({ loadingId, trailTripId: trip.tripId, from: new Date(from).toISOString(), to: new Date(to).toISOString() });
      const response = await fetch(`/api/mobile/v1/admin/live-tracking?${params}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not load GPS trail.");
      onTrail(result.data.points);
      setNotice(result.data.points.length ? `${result.data.points.length === 1 ? "One recorded GPS point is marked on the map." : "Recorded GPS points are connected by a purple line on the map."}${result.data.limited ? " This interval exceeds the point limit." : ""}` : "No usable GPS points in this time range.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  return <form onSubmit={load} className={`${CARD} space-y-2 p-4 text-sm`}>
    <h2 className="font-bold">Recorded GPS history</h2>
    <p className="text-slate-600">See where this trip reported GPS during a selected period. The purple line connects recorded points and may cross gaps in coverage. Times use your browser’s time zone.</p>
    <div className="flex flex-wrap items-end gap-3">
      <label>Trip <select disabled={loading} value={trip.tripId} onChange={(event) => { setTripId(event.target.value); setRange(null); setNotice(""); onTrail(null); }} className="rounded border border-slate-300 bg-white p-1 text-slate-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200 enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">{trips.map((item) => <option key={item.tripId} value={item.tripId}>{item.vehicleNo} · {item.driver?.displayName} · {item.tripState?.replaceAll("_", " ")}{item.session?.startedAt ? ` · ${formatDate(item.session.startedAt)}` : ""}</option>)}</select></label>
      {hasGps && <>
        <label>From <input type="datetime-local" required disabled={loading} value={from} onChange={(event) => setRange({ from: event.target.value, to })} className="rounded border p-1" /></label>
        <label>To <input type="datetime-local" required disabled={loading} value={to} onChange={(event) => setRange({ from, to: event.target.value })} className="rounded border p-1" /></label>
        <button disabled={loading} className="rounded bg-yellow-200 px-3 py-1 font-bold">{loading ? "Loading…" : "Show on map"}</button>
        <button type="button" disabled={loading} onClick={() => { onTrail(null); setNotice(""); }} className="underline">Clear map history</button>
      </>}
    </div>
    {!hasGps && <p className="text-slate-600">No GPS has been recorded for this trip.</p>}
    {notice && <p role="status">{notice}</p>}
  </form>;
}

function DropControls({ trip, onRefresh }) {
  const [sequence, setSequence] = useState(null);
  const [action, setAction] = useState("configure_stop");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const drop = trip.drops.find((item) => item.sequence === sequence) || trip.drops[0];

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const payload = { action, stopSequence: drop.sequence, reason: form.get("reason") };
    if (action === "configure_stop") {
      payload.radiusM = Number(form.get("radiusM"));
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/mobile/v1/admin/trips/${trip.tripId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not update this drop.");
      setNotice({ configure_stop: "Drop settings saved.", override_arrival: "Arrival recorded by dispatch.", resolve_drop: "Drop marked resolved by dispatch." }[action]);
      onRefresh();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return <details className="rounded border p-3 text-sm sm:col-span-2 lg:col-span-3">
    <summary className="cursor-pointer font-bold">Manage delivery stops</summary>
    <label className="mt-2 block">Drop <select disabled={busy} className="rounded border border-slate-300 bg-white p-1 text-slate-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200 enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" value={drop.sequence} onChange={(event) => { setSequence(Number(event.target.value)); setNotice(""); }}>
      {trip.drops.map((item) => <option key={item.sequence} value={item.sequence}>{item.sequence} · {item.label} · {item.status}</option>)}
    </select></label>
    <form key={drop.sequence} onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
      <label>Action <select value={action} disabled={busy} onChange={(event) => { setAction(event.target.value); setNotice(""); }} className="block rounded border border-slate-300 bg-white p-1 text-slate-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200 enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"><option value="configure_stop">Set GPS arrival radius</option><option value="override_arrival">Record arrival manually</option><option value="resolve_drop">Mark drop resolved</option></select></label>
      <p className="basis-full text-slate-600">{{ configure_stop: "The saved drop address is the center of the arrival area. Set how close the driver must be.", override_arrival: "Use when dispatch has confirmed arrival at the next drop and GPS verification is unavailable. This records arrival only.", resolve_drop: "Use when dispatch has settled an exception and the next drop can be closed. This counts toward trip completion." }[action]}</p>
      <div key={action} className="flex flex-wrap items-end gap-2">
        {action === "configure_stop" && <>
          <p className="basis-full text-slate-600">{drop.address || "No address recorded for this drop."}</p>
          <label>Radius (m) <input className="block w-24 rounded border p-1" name="radiusM" required type="number" min={50} max={1000} defaultValue={drop.geofence?.radiusM || 200} /></label>
        </>}
        {action !== "configure_stop" && <label>Reason <input className="block rounded border p-1" name="reason" required maxLength={300} /></label>}
        <button disabled={busy} className="rounded bg-yellow-200 px-3 py-1 font-bold">{{ configure_stop: "Save drop settings", override_arrival: "Record arrival", resolve_drop: "Resolve drop" }[action]}</button>
      </div>
    </form>
    {notice && <p className="mt-2" role="status">{notice}</p>}
  </details>;
}

function LoadingTrackingList({ loadings, visible, loading, onSelect }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [tracking, setTracking] = useState(null);
  const pageSize = 25;
  const search = query.trim().toLowerCase();
  const searched = loadings.filter((row) => [row.vehicleArrivalNo, row.vehicleNo, ...(row.orderNumbers || [])]
    .some((value) => String(value || "").toLowerCase().includes(search)));
  const searchPage = Math.min(page, Math.max(0, Math.ceil(searched.length / pageSize) - 1));
  const statusSource = statusFilter ? loadings : searched.slice(searchPage * pageSize, (searchPage + 1) * pageSize);
  const ids = statusSource.map((row) => row._id).join(",");
  const result = tracking?.ids === ids ? tracking : null;
  const filtered = !statusFilter ? searched : result?.byId
    ? searched.filter((row) => loadingTrackingLabel(result, result.byId.get(String(row._id)))[0] === statusFilter) : [];
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const start = currentPage * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  useEffect(() => {
    if (!visible || !ids) return;
    const controller = new AbortController();
    let timer;
    const loadingIds = ids.split(",");
    const batches = [];
    for (let offset = 0; offset < loadingIds.length; offset += pageSize) batches.push(loadingIds.slice(offset, offset + pageSize));
    const fetchBatch = async (batch) => {
      const response = await fetch(`/api/mobile/v1/admin/live-tracking?loadingIds=${encodeURIComponent(batch.join(","))}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Tracking status is temporarily unavailable.");
      return payload.data;
    };
    const refresh = async () => {
      try {
        const byId = new Map();
        for (let offset = 0; offset < batches.length; offset += 4) {
          const group = await Promise.all(batches.slice(offset, offset + 4).map(fetchBatch));
          if (controller.signal.aborted) return;
          for (const row of group.flat()) byId.set(row.loadingId, row);
        }
        if (!controller.signal.aborted) setTracking({ ids, byId });
      } catch (error) {
        if (!controller.signal.aborted) setTracking({ ids, error: error.message });
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(refresh, 30000);
      }
    };
    refresh();
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [ids, visible]);

  const statusRows = rows.map((row) => result?.byId?.get(String(row._id))).filter(Boolean);
  const liveCount = statusRows.filter((row) => row.trackingStatus === "active").length;
  const staleCount = statusRows.filter((row) => row.trackingStatus === "stale" && row.lastRecordedAt).length;

  return (
    <section hidden={!visible} className={`${CARD} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Loadings <span className="ml-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{filtered.length}</span></h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <Radio size={14} aria-hidden="true" className={liveCount ? "text-emerald-700" : "text-slate-500"} />
            Refreshes every 30 seconds
            {result?.byId && <span className="border-l border-slate-200 pl-2">On this page: <strong className="text-emerald-800">{liveCount} live</strong>{staleCount > 0 && <> · <strong className="text-amber-800">{staleCount} stale GPS</strong></>}</span>}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
        <select aria-label="Tracking status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }} className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200">
          <option value="">All tracking statuses</option>
          {["Live", "Completed", "GPS stale", "Waiting for GPS", "Assigned", "No trip assigned", "GPS not started", "Tracking paused", "Tracking ended", "Cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search loadings</span>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }}
            placeholder="Loading no., vehicle no. or order" className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-yellow-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-yellow-200" />
        </label>
        </div>
      </div>
      {result?.error && <p role="status" className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-900">{result.error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-slate-100 text-xs text-slate-700"><tr>
            <th scope="col" className="px-4 py-3">Loading no.</th>
            <th scope="col" className="px-4 py-3">Vehicle no.</th>
            <th scope="col" className="px-4 py-3">Tracking status</th>
            <th scope="col" className="px-4 py-3">Last GPS update</th>
            <th scope="col" className="px-4 py-3 text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const trackingRow = result?.byId?.get(String(row._id));
              const [label, tone] = loadingTrackingLabel(result, trackingRow);
              return <tr key={row._id} className={tone === "green" ? "bg-emerald-50/60 hover:bg-emerald-50" : tone === "blue" ? "bg-blue-50/60 hover:bg-blue-50" : tone === "yellow" ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-slate-50"}>
                <th scope="row" className={`border-l-4 px-3 py-2.5 font-bold text-slate-900 ${tone === "green" ? "border-emerald-500" : tone === "blue" ? "border-blue-500" : tone === "yellow" ? "border-amber-400" : "border-transparent"}`}>{valueOf(row.vehicleArrivalNo)}</th>
                <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><Truck size={15} className="text-slate-500" aria-hidden="true" />{valueOf(row.vehicleNo)}</span></td>
                <td className="px-4 py-2.5"><Chip tone={tone}>{tone === "green" && <span aria-hidden="true" className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600" />}{tone === "blue" && <Check size={13} className="mr-1" aria-hidden="true" />}{label}</Chip></td>
                <td className="px-4 py-3 text-slate-600">{trackingRow?.lastRecordedAt ? <time dateTime={trackingRow.lastRecordedAt} title={new Date(trackingRow.lastRecordedAt).toLocaleString()}>{relativeTime(trackingRow.lastRecordedAt)}</time> : dash}</td>
                <td className="px-4 py-2.5 text-right"><button type="button" onClick={() => onSelect(row._id)} aria-label={`View tracking for ${row.vehicleArrivalNo}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${tone === "green" ? "border-yellow-400 bg-yellow-400 text-slate-950 hover:bg-yellow-300" : "border-slate-200 bg-white text-slate-700 hover:border-yellow-400 hover:bg-yellow-50"}`}>View tracking <ArrowRight size={14} aria-hidden="true" /></button></td>
              </tr>;
            })}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">{loading ? "Loading records…" : statusFilter && ids && !result ? "Checking tracking statuses…" : statusFilter && result?.error ? "Unable to filter by tracking status." : search || statusFilter ? "No loadings match your filters." : "No loading records found."}</td></tr>}
          </tbody>
        </table>
      </div>
      {filtered.length > pageSize && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-sm">
        <span>Showing {start + 1}–{start + rows.length} of {filtered.length}</span>
        <div className="flex gap-2">
          <button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
          <button type="button" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
        </div>
      </div>}
    </section>
  );
}

function loadingTrackingLabel(result, row) {
  if (!result) return ["Checking…", "slate"];
  if (result.error) return ["Unavailable", "slate"];
  if (!row) return ["No trip assigned", "slate"];
  if (row.tripState === "completed") return ["Completed", "blue"];
  if (row.tripState === "cancelled") return ["Cancelled", "slate"];
  if (row.trackingStatus === "active") return ["Live", "green"];
  if (row.trackingStatus === "stale") return [row.lastRecordedAt ? "GPS stale" : "Waiting for GPS", "yellow"];
  if (row.trackingStatus === "ended") return ["Tracking ended", "yellow"];
  if (row.trackingStatus === "paused") return ["Tracking paused", "yellow"];
  return row.tripState === "assigned" ? ["Assigned", "slate"] : ["GPS not started", "yellow"];
}

// Builds an LR-shaped object from the loading, with LR values winning where an LR exists.
// This keeps makeTrackingValues() and SummaryBar working unchanged.
function buildSelected(loading, lrList = []) {
  const lr = lrList[0] || null;
  const rows = loading?.orderRows || [];
  const row = rows[0] || {};
  const lrHeader = lr?.header || {};
  const toNames = [...new Set(rows.map((r) => r.toName || r.to).filter(Boolean))].join(", ");
  const orderNos = [...new Set(rows.map((r) => r.orderNo).filter(Boolean))];
  const plantLabel = (r) => r?.plantCodeValue ? `${r.plantName || ""} (${r.plantCodeValue})` : (r?.plantName || "");
  return {
    ...(lr || {}),
    _hasLr: Boolean(lr),
    _lrNos: lrList.map((x) => x.lrNo).filter(Boolean),
    _vehicleMismatch: vehicleMismatch(lrList, loading),
    _rows: rows.map((order) => ({ ...order, trackingPlantCode: trackingPlantCode(order, lrForRow(order, lrList)?.header?.plantCode) })),
    loadingInfoNo: loading?.vehicleArrivalNo,
    loadingDriver: { name: loading?.vehicleInfo?.driverName, mobile: loading?.vehicleInfo?.driverMobileNo },
    vnnNo: lr?.vnnNo || loading?.selectedVehicleNegotiation?.vnnNo || loading?.vehicleNegotiationNo || "",
    subCompanyName: lr?.subCompanyName || loading?.subCompanyName,
    subCompanyCode: lr?.subCompanyCode || loading?.subCompanyCode,
    deliveryType: loading?.delivery,
    billingType: loading?.billingType,
    noOfLoadingPoints: loading?.noOfLoadingPoints,
    noOfDroppingPoint: loading?.noOfDroppingPoint,
    totalWeight: loading?.totalWeight ?? lr?.totalWeight,
    createdAt: loading?.date,
    header: {
      ...lrHeader,
      lrDate: lrHeader.lrDate || loading?.date || "",
      orderNo: lrHeader.orderNo || orderNos.join(", "),
      partyName: lrHeader.partyName || row.partyName,
      plantCode: trackingPlantCode(row, (rows.length ? lrForRow(row, lrList)?.header : lrHeader)?.plantCode),
      plantName: lrHeader.plantName || row.plantName,
      orderType: lrHeader.orderType || row.orderType,
      pinCode: row.pinCode,
      state: lrHeader.state || row.stateName || row.state,
      district: lrHeader.district || row.districtName || row.district,
      from: lrHeader.from || row.fromName || row.from,
      to: toNames || lrHeader.to,
      vehicleNo: loading?.vehicleInfo?.vehicleNo || lrHeader.vehicleNo,
    },
  };
}
const norm = (v) => String(v ?? "").trim().toLowerCase();
// Joins address parts, skipping blanks and repeats (a town and its taluka can share a name).
const joinText = (parts) => [...new Map(parts.map((p) => String(p ?? "").trim()).filter(Boolean).map((p) => [p.toLowerCase(), p])).values()].join(", ");
const plate = (v) => String(v ?? "").replace(/\s+/g, "").toUpperCase();
const pinFromText = (text) => (String(text || "").match(/\b\d{6}\b/g) || []).pop() || "";

// The LR form can carry a different truck than the loading (it is filled from the vehicle negotiation).
function vehicleMismatch(lrList, loading) {
  const loadingVehicle = loading?.vehicleInfo?.vehicleNo;
  const lr = lrList.find((l) => plate(l.header?.vehicleNo) && plate(loadingVehicle) && plate(l.header.vehicleNo) !== plate(loadingVehicle));
  return lr ? { lrNo: lr.lrNo, lrVehicle: lr.header.vehicleNo, loadingVehicle } : null;
}

// Which LR covers this order row? An LR linked to a row (orderRowId) covers only that row.
// Otherwise it is a whole-loading LR (one LR per loading) and covers every row of its order.
function lrForRow(row, lrList) {
  const byRowId = lrList.find((l) => l.orderRowId && String(l.orderRowId) === String(row._id));
  if (byRowId) return byRowId;
  return lrList.find((l) => !l.orderRowId && norm(l.header?.orderNo) === norm(row.orderNo)) || null;
}

// One pickup per distinct origin and one drop per order row, each labelled with where its address came from.
function buildStops(loading, lrList = [], master = { matches: {}, unmatched: {} }) {
  const rows = loading?.orderRows || [];
  const stops = [];
  for (const row of rows) {
    const lr = lrForRow(row, lrList);
    // A whole-loading LR has one consignee, which belongs to the LR's own destination only.
    const ownsConsignee = lr && (lr.orderRowId || norm(lr.header?.to) === norm(row.toName || row.to));
    const consigneeText = String(lr?.consignee?.address || "").trim();
    const text = ownsConsignee ? consigneeText : "";
    const fromMaster = text ? null : master.matches?.[String(row._id)] || null;
    const masterNote = master.unmatched?.[String(row._id)] || "";
    const place = joinText([row.toName || row.to, row.talukaName || row.taluka, row.districtName || row.district, row.stateName || row.state]);
    stops.push({
      type: "drop", orderNo: row.orderNo, partyName: text ? lr.consignee.name || row.partyName : row.partyName,
      weight: `${row.weight || 0} MT`, lrNo: lr?.lrNo || "",
      address: { text: text || fromMaster?.text || joinText([place, row.pinCode]), title: text ? lr.consignee.selectedAddressTitle : fromMaster?.title || "" },
      place: { city: row.toName || row.to, pin: text ? pinFromText(text) || row.pinCode : fromMaster?.pin || row.pinCode },
      addressSource: text ? "lr" : fromMaster ? "customer-master" : "approximate", needsReview: !text && !fromMaster,
      reason: text || fromMaster ? "" : [
        !lr ? "No LR for this drop yet"
          : !consigneeText ? `${lr.lrNo} has no consignee address yet`
            : `${lr.lrNo} consignee address is for ${lr.header?.to || "its own destination"} only`,
        masterNote,
      ].filter(Boolean).join(". "),
    });
  }
  let dropCount = 0;
  return stops.map((s, i) => ({ sequence: i + 1, ...s, dropNo: s.type === "pickup" ? null : ++dropCount }));
}

// routeInfo (optional) comes from /api/tracking/route and fills the distance and expected-delivery fields.
function trackingPlantCode(row, lrCode) {
  for (const value of [row.plantCodeValue, row.plantCode, lrCode]) {
    const text = String(value || "").trim();
    const code = (text.match(/\(([^)]+)\)$/)?.[1] || text).trim();
    if (code && !/^(?:NA|N\/A|0000|[a-f0-9]{24})$/i.test(code)) return code;
  }
  return "";
}

function makeTrackingValues(selected, routeInfo, trip, liveError) {
  const header = selected?.header || {}, ewaybill = selected?.ewaybill || {};
  const startDate = header.lrDate || selected?.createdAt || "";
  const orderCells = [header.orderNo, header.partyName, header.plantCode, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.state, header.district, header.from, header.to, `${selected?.totalWeight || 0} ${header.unit || "MT"}`];
  const rowsSource = selected?._rows?.length ? selected._rows : [];
  const orderTableRows = rowsSource.length
    ? rowsSource.map((r) => [
      r.orderNo, r.partyName, r.trackingPlantCode, r.orderType, r.pinCode,
      r.stateName || r.state, r.districtName || r.district, r.fromName || r.from, r.toName || r.to,
      `${r.weight || 0} ${header.unit || "MT"}`,
    ])
    : [orderCells];
  const delivered = ["delivered", "completed"].includes(trip?.tripState);
  const cancelled = trip?.tripState === "cancelled";
  const pendingRoute = delivered || cancelled ? null : routeInfo;
  const point = trip?.latestLocation;
  const phase = {
    assigned: "Assigned", started: "Heading to pickup", at_pickup: "At pickup", in_transit: "In transit",
    at_stop: "At delivery stop", delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
  }[trip?.tripState];
  const gpsStatus = liveError ? "Last known GPS" : {
    active: "GPS active", stale: point ? "GPS stale" : "Waiting for GPS", ended: "Tracking ended", paused: "GPS paused",
  }[trip?.session?.status] || "Awaiting GPS";
  const transitStatus = phase
    ? cancelled || trip.tripState === "completed" ? phase : `${phase} · ${gpsStatus}`
    : liveError ? "Tracking unavailable" : "Awaiting live location";
  const values = { purchaseNo: selected?.vnnNo || header.orderNo, pricingSerialNo: selected?.loadingInfoNo, autoAssign: header.vehicleNo ? "Assigned" : "Not Assigned", branch: selected?.subCompanyName || selected?.subCompanyCode, delivery: selected?.deliveryType || "Normal", date: formatDate(startDate), billingType: selected?.billingType || selected?.lcStatus || header.lcStatus || dash, multiOrder: header.orderNo, loadingPoints: String(selected?.noOfLoadingPoints || 1), droppingPoints: String(selected?.noOfDroppingPoint || 1), orderCells, orderTableRows, startDate: formatDate(trip?.startedAt || startDate), deliveryDays: dash, totalDays: dash, expectedDays: delivered ? "0 days" : pendingRoute ? `${pendingRoute.plan.expectedDays} day${pendingRoute.plan.expectedDays === 1 ? "" : "s"}` : dash, expectedDate: pendingRoute ? formatDate(pendingRoute.plan.expectedDate) : dash, ewaybillExtension: ewaybill.ewaybillNo ? "Required" : "Not Required", ewaybillExpiry: formatDate(ewaybill.expiryDate), totalKmPending: delivered ? "0 km" : pendingRoute ? `${pendingRoute.distanceKm} km` : dash, lastLocation: point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)} · ${relativeTime(point.recordedAt)}` : dash, transitStatus, remarks: selected?.remarks || header.remarks };
  return { ...values, panelHeaders: ["Date", "Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "From", "To", "District", "State", "Weight", "Start Date", "Delivery Days", "Total Days", "E-wayBill Expiry - Date", "Total Km - Pending", "Last Location", "Expected Days for Delivery", "E-waybill - Extension", "Tracking Status"], panelValues: [values.date, header.orderNo, header.partyName, header.plantCode, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.from, header.to, header.district, header.state, `${selected?.totalWeight || 0} ${header.unit || "MT"}`, values.startDate, values.deliveryDays, values.totalDays, values.ewaybillExpiry, values.totalKmPending, values.lastLocation, values.expectedDays, values.ewaybillExtension, values.transitStatus] };
}

const CHIP_TONES = {
  blue: "border-blue-200 bg-blue-100 text-blue-900",
  green: "border-emerald-200 bg-emerald-100 text-emerald-800",
  yellow: "border-yellow-300 bg-yellow-100 text-yellow-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};
const formatLiveStatus = (value) => ({ active: "active", stale: "stale", not_started: "not started", ended: "ended" }[value] || value || "unknown");
const relativeTime = (value) => {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
};
function AssignDriverDialog({ loadingId, loadingReference, vehicleNo, loadingDriver, onClose, onAssigned }) {
  const dialog = useRef(null);
  const searchField = useRef(null);
  const [drivers, setDrivers] = useState(null);
  const [query, setQuery] = useState("");
  const [driverId, setDriverId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mobileDigits = String(loadingDriver?.mobile || "").replace(/\D/g, "");
  const expectedMobile = mobileDigits.length === 10 ? `+91${mobileDigits}`
    : mobileDigits.length >= 11 && mobileDigits.length <= 15 ? `+${mobileDigits}` : "";
  const request = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Unable to complete this request.");
    return result.data;
  };
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    searchField.current?.focus();
    const controller = new AbortController();
    request("/api/mobile/v1/admin/drivers", { signal: controller.signal }).then((rows) => {
      if (controller.signal.aborted) return;
      const available = rows.filter((row) => row.status === "active" && (!expectedMobile || row.mobileE164 === expectedMobile));
      setDrivers(available);
      if (expectedMobile && available.length === 1) setDriverId(available[0].id);
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => {
      controller.abort();
      element.close();
    };
  }, [expectedMobile]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy || !driverId) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/mobile/v1/admin/trips", { method: "POST", body: JSON.stringify({ loadingId, driverId }) });
      onAssigned();
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };
  const search = query.trim().toLowerCase();
  const matches = drivers?.filter((driver) => [driver.displayName, driver.mobileE164].some((value) => value?.toLowerCase().includes(search)));
  return <dialog ref={dialog} aria-labelledby="assign-driver-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-950/50">
    <header className="border-b border-slate-100 px-4 py-3">
      <h2 id="assign-driver-title" className="text-base font-bold text-slate-900">Assign driver</h2>
      <p className="mt-0.5 text-xs text-slate-600">{loadingReference} · {vehicleNo || "Vehicle pending"}</p>
      {expectedMobile && <p className="mt-1 text-xs text-slate-700">Driver on Loading Info · {loadingDriver?.name ? `${loadingDriver.name} · ` : ""}{expectedMobile}</p>}
    </header>
    <form onSubmit={submit} className="space-y-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="assign-driver-search" className="text-xs font-bold text-slate-700">Choose a driver</label>
        {!busy && <Link href={{ pathname: "/admin/Driver-Mobile", query: { tab: "drivers", create: "1", loadingId } }} className="text-xs font-bold text-yellow-800 underline-offset-4 hover:underline">+ Create driver</Link>}
      </div>
      <input id="assign-driver-search" ref={searchField} type="search" placeholder="Search name or mobile number" value={query} disabled={busy}
        onChange={(event) => { setQuery(event.target.value); setDriverId(""); }} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      <fieldset aria-label="Available drivers" disabled={busy} className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
        {matches?.map((driver) => <label key={driver.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-2.5 py-1.5 last:border-b-0 hover:bg-yellow-50 has-[:checked]:bg-yellow-50">
          <input type="radio" name="driver" value={driver.id} checked={driverId === driver.id} onChange={() => setDriverId(driver.id)} className="shrink-0 accent-yellow-600" />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{driver.displayName}</span>
          <span className="shrink-0 text-xs tabular-nums text-slate-600">{driver.mobileE164}</span>
        </label>)}
          {!matches?.length && <p className="px-3 py-2 text-xs text-slate-600">{drivers ? search && drivers.length ? "No matching drivers." : expectedMobile ? "No active driver profile matches this loading’s number. Check Driver Access Master or correct the driver in Loading Info." : "No active drivers available." : error ? "Driver list unavailable." : "Loading drivers…"}</p>}
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold">Cancel</button>
        <button type="submit" disabled={!driverId || busy} className="rounded-lg bg-yellow-400 px-3 py-1.5 text-sm font-bold disabled:opacity-50">{busy ? "Assigning…" : "Assign trip"}</button>
      </div>
    </form>
  </dialog>;
}

function LiveTrackingPanel({ loadingId, loadingReference, vehicleNo, loadingDriver, data, loading, error, routeInfo, editable, onApproveBaseline, onRefresh }) {
  const [assigning, setAssigning] = useState(false);
  const [assignmentSaved, setAssignmentSaved] = useState(false);
  const trips = data?.trips || [];
  const canAssign = editable && data && !error && trips.every((trip) => ["completed", "cancelled"].includes(trip.tripState));
  return (
    <section className={`${CARD} overflow-hidden`}>
      <SectionHeader title="Driver live status" right={<div className="flex flex-wrap gap-2">
        {canAssign && <button type="button" onClick={() => { setAssignmentSaved(false); setAssigning(true); }} className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white hover:bg-slate-700">Assign driver</button>}
        <button type="button" onClick={onRefresh} disabled={loading} className="rounded-lg border border-yellow-700/30 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 hover:bg-yellow-50 disabled:cursor-wait disabled:bg-slate-100 disabled:text-slate-500">{loading ? "Refreshing…" : "Refresh GPS"}</button>
      </div>} />
      {assigning && <AssignDriverDialog loadingId={loadingId} loadingReference={loadingReference} vehicleNo={vehicleNo} loadingDriver={loadingDriver} onClose={() => setAssigning(false)} onAssigned={() => { setAssigning(false); setAssignmentSaved(true); onRefresh(); }} />}
      {assignmentSaved && <p role="status" className="px-4 py-2 text-sm text-emerald-800">Driver assigned.</p>}
      {!data && !error && <p role="status" className="px-4 py-3 text-sm text-slate-600">Loading driver status…</p>}
      {error && <div role="status" className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">Mobile tracking is unavailable: {error}</div>}
      {data && !error && trips.length === 0 && <div className="px-4 py-5 text-sm text-slate-600">No driver trip has been assigned to this loading yet.</div>}
      {trips.length > 0 && <div className="divide-y divide-slate-100">{trips.map((trip) => {
        const closed = ["completed", "cancelled"].includes(trip.tripState);
        const routeSaved = trip.eta?.status === "available";
        const tone = !error && trip.session?.status === "active" ? "green" : error || trip.session?.status === "stale" ? "yellow" : "slate";
        return <div key={trip.tripId} className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Driver / vehicle</div><div className="mt-1 font-bold text-slate-900">{trip.driver?.displayName || "Driver unavailable"}</div><div className="text-sm text-slate-600">{trip.vehicleNo || "Vehicle pending"}</div></div>
          <div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Trip status</div><div className="mt-1"><Chip tone={tone}>{error ? "last known" : formatLiveStatus(trip.session?.status)}</Chip></div><div className="mt-1 text-sm text-slate-600">{trip.tripState?.replaceAll("_", " ") || "—"}</div></div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Actual pickup</div>
            <div className="mt-1 font-bold text-slate-900">{trip.actualPickup ? `${trip.actualPickup.latitude.toFixed(5)}, ${trip.actualPickup.longitude.toFixed(5)}` : closed ? "No pickup recorded" : "Waiting for pickup GPS"}</div>
            {trip.actualPickup && <div className="text-sm text-slate-600">{new Date(trip.actualPickup.recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</div>}
          </div>
          <div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Last GPS update</div><div className="mt-1 font-bold text-slate-900">{trip.session?.lastRecordedAt ? relativeTime(trip.session.lastRecordedAt) : "No point received"}</div>{trip.latestLocation && <div className="text-sm text-slate-600">Accuracy {Math.round(trip.latestLocation.accuracyM)} m</div>}</div>
          <div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Coordinates</div><div className="mt-1 font-mono text-sm font-bold text-slate-900">{trip.latestLocation ? `${trip.latestLocation.latitude.toFixed(5)}, ${trip.latestLocation.longitude.toFixed(5)}` : "—"}</div><div className="text-sm text-slate-600">{trip.latestLocation?.isMocked ? "Mock location flagged" : trip.latestLocation?.speedMps != null ? `${Math.round(trip.latestLocation.speedMps * 3.6)} km/h` : ""}</div></div>
          <div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Operational stop</div><div className="mt-1 text-sm font-semibold text-slate-800">{trip.operationalStop ? `${Math.max(1, Math.floor(trip.operationalStop.durationSec / 60))} min stationary` : "No sustained stop"}</div><div className="text-sm text-slate-600">{trip.operationalStop ? `${trip.operationalStop.classification} · ${Math.round(trip.operationalStop.confidence * 100)}% confidence` : "Driver action confirms actual delivery"}</div></div>
          {!closed && trip.remainingStops?.length > 0 && <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Delivery ETA setup</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">{routeSaved ? "Planned route saved" : "Planned route needed"}</div>
            <p className="text-sm text-slate-600">{routeSaved ? "A live estimate requires recent GPS and a route to the remaining drops." : "Save the planned distance and driving time as the reference for ETA."}</p>
            {!routeSaved && routeInfo && editable && <button type="button" disabled={loading} onClick={() => onApproveBaseline(trip.tripId)} className="mt-2 rounded-md border border-yellow-400 bg-yellow-50 px-2 py-1 text-xs font-bold text-yellow-900 disabled:opacity-60">Save planned route for ETA</button>}
          </div>}
          {!closed && <div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Operational action</div><div className="mt-1 text-sm font-semibold text-slate-800">{trip.session?.status === "stale" ? "Call driver / check device data" : trip.session?.status === "active" ? "Monitoring normally" : trip.tripState === "assigned" ? "Waiting for the driver to start the trip" : "Ask the driver to check tracking on their phone"}</div></div>}
          {trip.deviceHealth && <div className="text-sm"><strong>Phone check-in</strong><p>{relativeTime(trip.deviceHealth.reportedAt)} · {trip.deviceHealth.locationReady ? "Location on" : "Location unavailable"} · {trip.deviceHealth.queuedPoints ?? "—"} queued</p><p>{trip.latestLocation?.batteryPct != null ? `${trip.latestLocation.batteryPct}% battery${trip.latestLocation.isCharging ? " · charging" : ""}` : "Battery unavailable"}</p></div>}
          {editable && !closed && trip.drops?.length > 0 && <DropControls trip={trip} onRefresh={onRefresh} />}
        </div>;
      })}</div>}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">Refreshes every 15 seconds while this page is visible. Closed trips may show their last recorded GPS position.</div>
    </section>
  );
}
function Chip({ tone = "slate", children }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${CHIP_TONES[tone]}`}>{children}</span>;
}
function Spinner() {
  return <span className="inline-block h-5 w-5 animate-spin rounded-full border-b-2 border-yellow-500" aria-hidden="true" />;
}
function SectionHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-yellow-500 bg-yellow-400 px-4 py-2.5">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">{title}</h2>
      {right}
    </div>
  );
}
function SummaryBar({ selected, tracking }) {
  const header = selected?.header || {};
  return (
    <section className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-yellow-700">Loading Info</p>
          <p className="truncate text-lg font-extrabold text-slate-900">{valueOf(selected?.loadingInfoNo)}</p>
          <p className="truncate text-sm text-slate-600">{valueOf(header.partyName)} • {selected?._lrNos?.length ? `LR ${selected._lrNos.join(", ")}` : "LR not created yet"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Route</p><p className="font-semibold text-slate-900">{valueOf(header.from)} → {valueOf(header.to)}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Vehicle</p><p className="font-semibold text-slate-900">{valueOf(header.vehicleNo)}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Weight</p><p className="font-semibold text-slate-900">{`${selected?.totalWeight || 0} ${header.unit || "MT"}`}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone={tracking.autoAssign === "Assigned" ? "green" : "yellow"}>{tracking.autoAssign}</Chip>
          <Chip tone="yellow">{tracking.transitStatus}</Chip>
        </div>
      </div>
    </section>
  );
}
function ReadField({ label, value, accent }) {
  const tone = accent === "yellow" ? "border-yellow-300 bg-yellow-50" : accent === "green" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">{valueOf(value)}</div>
    </div>
  );
}
function StatusField({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1"><Chip tone={tone}>{valueOf(value)}</Chip></div>
    </div>
  );
}
function OrderTable({ rows }) {
  const heads = ["Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "State", "District", "From", "To", "Weight"];
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1050px] text-left text-xs">
        <thead className="bg-yellow-100 text-slate-900">
          <tr>{heads.map((head) => <th key={head} className="whitespace-nowrap border-b border-yellow-300 px-3 py-2 font-bold">{head}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex} className="text-slate-700 hover:bg-yellow-50">
              {cells.map((cell, index) => <td key={index} className="whitespace-nowrap px-3 py-2.5">{valueOf(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function MapPlaceholder() {
  return (
    <section className={`${CARD} overflow-hidden`}>
      <SectionHeader title="Live location tracking" right={<Chip tone="slate">Not configured</Chip>} />
      <div className="flex min-h-64 flex-col items-center justify-center bg-[linear-gradient(135deg,#fefce8_25%,#ffffff_25%,#ffffff_50%,#fefce8_50%,#fefce8_75%,#ffffff_75%)] bg-[length:32px_32px] p-6 text-center">
        <div className="rounded-full border border-yellow-300 bg-yellow-100 p-4 text-3xl text-yellow-700">⌖</div>
        <h3 className="mt-3 text-lg font-bold text-slate-900">Google Maps tracking placeholder</h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Location, remaining distance, route duration, ETA and actual-delivery values will appear here once Google Maps and approved driver-location integration are configured. No Google request is made until then.</p>
      </div>
    </section>
  );
}
function TrackingTable({ tracking }) {
  return (
    <section className={`${CARD} overflow-hidden`}>
      <SectionHeader title="Tracking - Panel" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1900px] text-left text-xs">
          <thead className="bg-yellow-100 text-slate-900">
            <tr>{tracking.panelHeaders.map((head, i) => <th key={head} className={`whitespace-nowrap border-b border-yellow-300 px-3 py-2 font-bold ${i === 0 ? "sticky left-0 bg-yellow-100" : ""}`}>{head}</th>)}</tr>
          </thead>
          <tbody>
            <tr className="text-slate-700 hover:bg-yellow-50">{tracking.panelValues.map((cell, index) => <td key={index} className={`whitespace-nowrap px-3 py-2.5 ${index === 0 ? "sticky left-0 bg-white font-semibold" : ""}`}>{valueOf(cell)}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
function LoadingState({ text }) {
  return <div className="flex min-h-screen items-center justify-center gap-3 bg-slate-50 text-sm text-slate-600"><Spinner />{text}</div>;
}
function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-600">You do not have permission to access Tracking Plan.</p>
        <Link href="/admin" className="mt-5 inline-block rounded-xl bg-yellow-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-yellow-700">Return to dashboard</Link>
      </div>
    </div>
  );
}
function StopsTable({ stops }) {
  if (!stops.length) return null;
  const tone = (s) => (s.needsReview || s.addressSource === "approximate") ? "yellow" : "green";
  const label = { lr: "From LR", "customer-master": "Customer master", approximate: "Approximate" };
  return (
    <section className={`${CARD} overflow-hidden`}>
      <SectionHeader title="Stops" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-xs">
          <thead className="bg-yellow-100 text-slate-900">
            <tr>{["#", "Type", "Order", "Party", "Address", "Pin", "Weight", "LR", "Source"].map((h) => <th key={h} className="whitespace-nowrap border-b border-yellow-300 px-3 py-2 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {stops.map((s) => (
              <tr key={s.sequence} className="align-top text-slate-700 hover:bg-yellow-50">
                <td className="px-3 py-2.5">{s.type === "pickup" ? "P" : s.dropNo ?? s.sequence}</td>
                <td className="px-3 py-2.5 font-semibold">{s.type === "pickup" ? "Planned Pickup" : "Drop"}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.orderNo)}</td>
                <td className="min-w-[10rem] px-3 py-2.5">
                  {valueOf(s.partyName || s.label)}
                  {s.addressSource === "lr" && <div className="text-[11px] text-slate-500">{s.type === "pickup" ? "Consignor" : "Consignee"}</div>}
                </td>
                <td className="min-w-[24rem] whitespace-normal px-3 py-2.5">
                  {valueOf(s.address?.text || s.place?.city)}
                  {s.address?.title ? <div className="text-[11px] text-slate-500">{s.address.title}</div> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.place?.pin)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.weight)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{valueOf(s.lrNo)}</td>
                <td className="px-3 py-2.5">
                  <Chip tone={tone(s)}>{label[s.addressSource]}</Chip>
                  {s.needsReview && s.reason ? <div className="mt-1 text-[11px] text-slate-500">{s.reason}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
