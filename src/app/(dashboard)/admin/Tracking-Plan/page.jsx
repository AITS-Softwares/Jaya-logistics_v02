

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
  const { canView, loading: permissionLoading } = usePermission();
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
  const mapCacheRef = useRef(new Map());              // address signature -> { at, located, routeInfo }, this tab only
  const requestRef = useRef(0);                      // ignores answers for a loading the user has already left

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

  const selectLoading = async (id) => {
    const requestId = ++requestRef.current;
    setSelectedId(id); setSelected(null); setError(""); setStops([]); setGeo({}); setRouteInfo(null); setMapNote("");
    if (!id) return;
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

      setSelected(buildSelected(lpData.data, lrList));
      // Customer-master addresses are an extra: a failure here must not break the page.
      let master = { matches: {}, unmatched: {} };
      try {
        const stRes = await fetch(`/api/tracking/stops?loadingId=${encodeURIComponent(id)}`, { headers });
        const stData = await stRes.json().catch(() => ({}));
        if (stRes.ok && stData.success) master = { matches: stData.data.matches || {}, unmatched: stData.data.unmatched || {} };
      } catch { /* keep the approximate addresses */ }
      const built = buildStops(lpData.data, lrList, master);
      setStops(built);
      locateStops(built, headers, requestId); // map and route load after the page is already usable
    } catch (requestError) { setError(requestError.message || "Unable to load the selected Loading Info."); }
    finally { setDetailLoading(false); }
  };
  // Geocode the stops, then plan the route through the located ones. Both are extras: a failure only sets the map note.
  const locateStops = async (list, headers, requestId) => {
    // Re-selecting a loading within 10 minutes reuses the last answer: no geocode and no route request at all.
    const cacheKey = list.map((s) => `${s.type}:${s.address?.text || ""}|${s.place?.city || ""}|${s.place?.pin || ""}`).join("~");
    const hit = mapCacheRef.current.get(cacheKey);
    if (hit && Date.now() - hit.at < 10 * 60 * 1000) { setGeo(hit.located); setRouteInfo(hit.routeInfo); if (hit.note) setMapNote(hit.note); return; }
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

      // Drop consecutive stops at the same place (about 11 m): they add no road, only a wasted waypoint
      const points = list.filter((s) => located[String(s.sequence)]).map((s) => located[String(s.sequence)])
        .filter((p, i, a) => i === 0 || p.lat.toFixed(4) !== a[i - 1].lat.toFixed(4) || p.lng.toFixed(4) !== a[i - 1].lng.toFixed(4));
      if (points.length < 2) { mapCacheRef.current.set(cacheKey, { at: Date.now(), located, routeInfo: null, note: data.data.warning || "" }); return; }
      const { res: rRes, data: rData } = await post("/api/tracking/route", { stops: points });
      if (requestId !== requestRef.current) return;
      if (rRes.ok && rData.success) { setRouteInfo(rData.data); if (!data.data.warning) mapCacheRef.current.set(cacheKey, { at: Date.now(), located, routeInfo: rData.data, note: "" }); }
      else setMapNote(rData.code === "NOT_CONFIGURED" ? "Route planning is off: GOOGLE_MAPS_SERVER_KEY is not set." : rData.message || "Unable to plan the route.");
    } catch { if (requestId === requestRef.current) setMapNote("Unable to reach the map services."); }
  };

  const mapStops = useMemo(() => stops.map((s) => ({ ...s, geo: geo[String(s.sequence)] || null })), [stops, geo]);
  const tracking = useMemo(() => makeTrackingValues(selected, routeInfo), [selected, routeInfo]);

  if (permissionLoading) return <LoadingState text="Loading permissions…" />;
  if (!canView(MODULE_NAME)) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* Title + LR picker */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Transport operations</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Tracking Plan</h1>
            <p className="mt-1 text-sm text-slate-600">Read-only delivery and live-location planning for loadings.</p>
          </div>
          <div className="w-full sm:w-[28rem]">
            <label htmlFor="lr-combobox" className="text-xs font-bold uppercase tracking-wide text-slate-600">Loading Info / Vehicle No</label>
            <LoadingCombobox loadings={loadings} selectedId={selectedId} onSelect={selectLoading} loading={listLoading} disabled={detailLoading} />
          </div>
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {detailLoading && <div aria-live="polite" className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"><Spinner />Loading tracking data…</div>}
        {!selected && !detailLoading && <EmptyState />}

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
            <TrackingMap stops={mapStops} route={routeInfo} fallback={<MapPlaceholder />} />
            {mapNote && <div role="status" className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800">{mapNote}</div>}
            <TrackingTable tracking={tracking} />
          </>
        )}
      </div>
    </div>
  );
}

// One field that is both the search box and the dropdown: click it, type to filter, pick from the list.
function LoadingCombobox({ loadings, selectedId, onSelect, loading, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const labelOf = (lr) => `${lr.vehicleArrivalNo} / ${lr.vehicleNo}`;
  const selectedLr = loadings.find((lr) => lr._id === selectedId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return loadings;
    return loadings.filter((lr) => [lr.vehicleArrivalNo, lr.vehicleNo, lr.date, ...(lr.orderNumbers || [])].some((v) => String(v || "").toLowerCase().includes(q)));
  }, [loadings, query]);

  useEffect(() => {
    const close = (event) => { if (rootRef.current && !rootRef.current.contains(event.target)) { setOpen(false); setQuery(""); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => { if (open) document.getElementById(`lr-opt-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, open]);

  const choose = (lr) => { onSelect(lr._id); setOpen(false); setQuery(""); };
  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0))); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Enter" && open && filtered[active]) { event.preventDefault(); choose(filtered[active]); }
    else if (event.key === "Escape" || event.key === "Tab") { setOpen(false); setQuery(""); }
  };

  return (
    <div ref={rootRef} className="relative mt-1">
      <input
        id="lr-combobox" type="text" role="combobox" aria-expanded={open} aria-controls="lr-listbox" aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `lr-opt-${active}` : undefined}
        autoComplete="off" disabled={disabled || loading}
        value={open ? query : selectedLr ? labelOf(selectedLr) : ""}
        placeholder={loading ? "Loading Loading Info…" : "Search loading no, vehicle no or order"}
        onFocus={() => { setOpen(true); setQuery(""); setActive(0); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-16 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 disabled:bg-slate-100"
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {selectedId && !disabled && (
          <button type="button" aria-label="Clear selected loading" onMouseDown={(e) => e.preventDefault()} onClick={() => { onSelect(""); setQuery(""); }}
            className="rounded-md px-1.5 text-lg leading-none text-slate-400 hover:bg-yellow-50 hover:text-slate-700">×</button>
        )}
        <span aria-hidden="true" className="pointer-events-none text-xs text-slate-400">▾</span>
      </div>
      {open && (
        <ul id="lr-listbox" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {filtered.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">No matching loading info</li>}
          {filtered.map((lr, index) => (
            <li key={lr._id} id={`lr-opt-${index}`} role="option" aria-selected={lr._id === selectedId}
              onMouseDown={(e) => e.preventDefault()} onClick={() => choose(lr)} onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-2 text-sm ${index === active ? "bg-yellow-50" : ""} ${lr._id === selectedId ? "border-l-4 border-yellow-500" : "border-l-4 border-transparent"}`}>
              <div className="font-bold text-slate-900">{lr.vehicleArrivalNo} / {lr.vehicleNo}</div>
              <div className="truncate text-xs text-slate-500">{[lr.date, (lr.orderNumbers || []).join(", ")].filter(Boolean).join(" • ") || "Loading Info"}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
    _rows: rows,
    loadingInfoNo: loading?.vehicleArrivalNo,
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
      plantCode: lrHeader.plantCode || plantLabel(row),
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
  const plantLabel = (r) => (r.plantCodeValue ? `${r.plantName || ""} (${r.plantCodeValue})` : r.plantName || "");
  const consignorLr = lrList.find((l) => String(l.consignor?.address || "").trim());
  const pickups = new Map();
  for (const r of rows) {
    const key = r.plantCodeValue || r.plantName || r.fromName || r.from || "origin";
    const entry = pickups.get(key) || { row: r, weight: 0 };
    entry.weight += Number(r.weight) || 0;
    pickups.set(key, entry);
  }
  const stops = [];
  for (const { row, weight } of pickups.values()) {
    const lrText = String(consignorLr?.consignor?.address || "").trim();
    stops.push({
      type: "pickup", orderNo: row.orderNo, partyName: consignorLr?.consignor?.name || row.partyName, weight: `${weight} MT`,
      address: { text: lrText || joinText([plantLabel(row), row.fromName || row.from]) },
      place: { pin: lrText ? pinFromText(lrText) : "" },
      lrNo: lrText ? consignorLr.lrNo : "", addressSource: lrText ? "lr" : "approximate",
      needsReview: !lrText, reason: lrText ? "" : "Plant location only; LR has no consignor address",
    });
  }
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
function makeTrackingValues(selected, routeInfo = null) {
  const header = selected?.header || {}, ewaybill = selected?.ewaybill || {};
  const startDate = header.lrDate || selected?.createdAt || "";
  const orderCells = [header.orderNo, header.partyName, header.plantCode || header.plantName, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.state, header.district, header.from, header.to, `${selected?.totalWeight || 0} ${header.unit || "MT"}`, selected?.rate, selected?.totalAmount];
  const rowsSource = selected?._rows?.length ? selected._rows : [];
  const plantText = (r) => r.plantCodeValue ? `${r.plantName || ""} (${r.plantCodeValue})` : (r.plantName || "");
  const orderTableRows = rowsSource.length
    ? rowsSource.map((r) => [
      r.orderNo, r.partyName, plantText(r), r.orderType, r.pinCode,
      r.stateName || r.state, r.districtName || r.district, r.fromName || r.from, r.toName || r.to,
      `${r.weight || 0} ${header.unit || "MT"}`,
      r.orderNo === header.orderNo ? selected?.rate : undefined,
      r.orderNo === header.orderNo ? selected?.totalAmount : undefined,
    ])
    : [orderCells];
  const values = { purchaseNo: selected?.vnnNo || header.orderNo, pricingSerialNo: selected?.loadingInfoNo, autoAssign: header.vehicleNo ? "Assigned" : "Not Assigned", branch: selected?.subCompanyName || selected?.subCompanyCode, delivery: selected?.deliveryType || "Normal", date: formatDate(startDate), billingType: selected?.billingType || selected?.lcStatus || header.lcStatus || dash, multiOrder: header.orderNo, loadingPoints: String(selected?.noOfLoadingPoints || 1), droppingPoints: String(selected?.noOfDroppingPoint || 1), orderCells, orderTableRows, startDate: formatDate(startDate), deliveryDays: dash, totalDays: dash, expectedDays: routeInfo ? `${routeInfo.plan.expectedDays} day${routeInfo.plan.expectedDays === 1 ? "" : "s"}` : dash, expectedDate: routeInfo ? formatDate(routeInfo.plan.expectedDate) : dash, ewaybillExtension: ewaybill.ewaybillNo ? "Required" : "Not Required", ewaybillExpiry: formatDate(ewaybill.expiryDate), totalKmPending: routeInfo ? `${routeInfo.distanceKm} km` : dash, lastLocation: dash, transitStatus: "Awaiting live location", remarks: selected?.remarks || header.remarks };
  return { ...values, panelHeaders: ["Date", "Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "From", "To", "District", "State", "Weight", "Start Date", "Delivery Days", "Total Days", "E-wayBill Expiry - Date", "Total Km - Pending", "Last Location", "Expected Days for Delivery", "E-waybill - Extension", "Tracking Status"], panelValues: [values.date, header.orderNo, header.partyName, header.plantCode || header.plantName, header.orderType, header.pinCode || selected?.consignee?.pinCode, header.from, header.to, header.district, header.state, `${selected?.totalWeight || 0} ${header.unit || "MT"}`, values.startDate, values.deliveryDays, values.totalDays, values.ewaybillExpiry, values.totalKmPending, values.lastLocation, values.expectedDays, values.ewaybillExtension, values.transitStatus] };
}

const CHIP_TONES = {
  green: "border-emerald-200 bg-emerald-100 text-emerald-800",
  yellow: "border-yellow-300 bg-yellow-100 text-yellow-800",
  slate: "border-slate-200 bg-slate-100 text-slate-700",
};
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
  const heads = ["Order", "Party Name", "Plant Code", "Order Type", "Pin Code", "State", "District", "From", "To", "Weight", "Rate", "Total Amount"];
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
function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-yellow-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-2xl text-yellow-700">⌖</div>
      <p className="text-sm font-semibold text-slate-800">No loading selected</p>
      <p className="mt-1 text-sm text-slate-500">Search or pick a Loading Info above to load its read-only Tracking Plan.</p>
    </div>
  );
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
                <td className="px-3 py-2.5 font-semibold">{s.type === "pickup" ? "Pickup" : "Drop"}</td>
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