
// "use client";
// // Google Maps JavaScript map for the Tracking Plan page.
// // Browser key: NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY, restricted in Google Cloud to your site's domain (HTTP referrers)
// // and to the Maps JavaScript API only. It is read when the app is built, so restart/rebuild after setting it.
// import { useEffect, useRef, useState } from "react";

// const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
// const INDIA_CENTER = { lat: 22.9734, lng: 78.6569 };

// // Load the Maps script once per page, however many times the component mounts.
// let mapsPromise = null;
// function loadMaps() {
//     if (typeof window === "undefined") return Promise.reject(new Error("no window"));
//     if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
//     if (!mapsPromise) {
//         mapsPromise = new Promise((resolve, reject) => {
//             window.__trackingMapsReady = () => resolve(window.google.maps);
//             // Google calls this when the key is rejected (wrong referrer, API not enabled, billing off)
//             window.gm_authFailure = () => reject(new Error("AUTH_FAILURE"));
//             const script = document.createElement("script");
//             script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(BROWSER_KEY)}&v=weekly&loading=async&callback=__trackingMapsReady`;
//             script.async = true;
//             script.onerror = () => reject(new Error("SCRIPT_FAILED"));
//             document.head.appendChild(script);
//         }).catch((err) => { mapsPromise = null; throw err; });
//     }
//     return mapsPromise;
// }

// const COLORS = { vehicle: "#2563eb" };
// const PIN = { pickup: "#16a34a", drop: "#dc2626", both: "#334155" }; // green = pickup, red = drop, dark = pickup and drop at one place

// // A big teardrop pin with the label in a white circle. Drawn as SVG so the label is always centred and readable.
// // kind: pickup | drop | both. text: "P", "3", "2,3". approx: dashed ring = town-level position.
// function pinIcon(maps, { kind, text, approx }) {
//     const color = PIN[kind];
//     const size = text.length <= 2 ? 17 : text.length <= 4 ? 13 : 10;
//     const svg =
//         `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="58" viewBox="0 0 44 58">` +
//         `<path d="M22 56C22 56 3 34 3 21 3 10.5 11.5 2 22 2s19 8.5 19 19C41 34 22 56 22 56z" fill="${color}" stroke="#ffffff" stroke-width="3"/>` +
//         `<circle cx="22" cy="21" r="12.5" fill="#ffffff"${approx ? ` stroke="${color}" stroke-width="2" stroke-dasharray="3 2"` : ""}/>` +
//         `<text x="22" y="21" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${size}" fill="${color}">${text}</text>` +
//         `</svg>`;
//     return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new maps.Size(44, 58), anchor: new maps.Point(22, 56) };
// }
// // Label for one or more stops at the same place: "P", "3" or "2,3" (long lists shortened to "2,3+2")
// function groupLabel(group) {
//     const labels = group.map((s) => (s.type === "pickup" ? "P" : String(s.sequence)));
//     return labels.length > 3 ? `${labels.slice(0, 2).join(",")}+${labels.length - 2}` : labels.join(",");
// }
// const stopTitle = (s) => (s.type === "pickup" ? "Pickup" : `Drop ${s.sequence}`);

// // Google's encoded polyline -> [{lat, lng}, ...]
// function decodePolyline(encoded) {
//     const path = [];
//     let index = 0, lat = 0, lng = 0;
//     while (index < encoded.length) {
//         for (const axis of ["lat", "lng"]) {
//             let shift = 0, result = 0, byte;
//             do {
//                 byte = encoded.charCodeAt(index++) - 63;
//                 result |= (byte & 0x1f) << shift;
//                 shift += 5;
//             } while (byte >= 0x20 && index < encoded.length + 1);
//             const delta = result & 1 ? ~(result >> 1) : result >> 1;
//             if (axis === "lat") lat += delta; else lng += delta;
//         }
//         path.push({ lat: lat / 1e5, lng: lng / 1e5 });
//     }
//     return path;
// }
// const hoursText = (h) => (h >= 24 ? `${Math.floor(h / 24)} d ${Math.round(h % 24)} h` : `${Math.round(h * 10) / 10} h`);
// const dateText = (iso) => { const [y, m, d] = String(iso || "").split("-"); return y && m && d ? `${d}/${m}/${y}` : "—"; };

// // stops: [{ sequence, type: "pickup"|"drop", partyName, orderNo, address: { text }, geo: { lat, lng, accuracy } | null }]
// // vehicle: { lat, lng, label? } | null (live location, added later)
// // route: the answer from /api/tracking/route ({ distanceKm, durationMinutes, polyline, plan }) | null
// // fallback: shown when there is no browser key
// export default function TrackingMap({ stops = [], vehicle = null, route = null, status = "", fallback = null }) {
//     const boxRef = useRef(null);
//     const mapRef = useRef(null);
//     const overlaysRef = useRef([]);
//     const [ready, setReady] = useState(false);
//     const [error, setError] = useState("");

//     // Create the map once
//     useEffect(() => {
//         if (!BROWSER_KEY) return;
//         let alive = true;
//         loadMaps()
//             .then(async (maps) => {
//                 const { Map } = await maps.importLibrary("maps");
//                 if (!alive || !boxRef.current) return;
//                 mapRef.current = new Map(boxRef.current, { center: INDIA_CENTER, zoom: 5, streetViewControl: false, mapTypeControl: false, fullscreenControl: true });
//                 setReady(true);
//             })
//             .catch((err) => {
//                 if (alive) setError(err.message === "AUTH_FAILURE"
//                     ? "Google rejected the map key. Check the domain restriction, that Maps JavaScript API is enabled, and that billing is on."
//                     : "The Google Maps script could not be loaded.");
//             });
//         return () => { alive = false; };
//     }, []);

//     // Redraw markers whenever the stops, the vehicle or the route change
//     useEffect(() => {
//         const map = mapRef.current;
//         if (!ready || !map) return;
//         const maps = window.google.maps;
//         overlaysRef.current.forEach((o) => o.setMap(null));
//         overlaysRef.current = [];

//         const bounds = new maps.LatLngBounds();
//         const info = new maps.InfoWindow();
//         const located = stops.filter((s) => s.geo && typeof s.geo.lat === "number");
//         const path = located.map((s) => ({ lat: s.geo.lat, lng: s.geo.lng }));

//         // Stops within ~11 m of each other share one pin, so they never sit on top of each other
//         const groups = new Map();
//         located.forEach((s) => {
//             const key = `${s.geo.lat.toFixed(4)},${s.geo.lng.toFixed(4)}`;
//             groups.set(key, [...(groups.get(key) || []), s]);
//         });

//         groups.forEach((group) => {
//             const position = { lat: group[0].geo.lat, lng: group[0].geo.lng };
//             const hasPickup = group.some((s) => s.type === "pickup");
//             const hasDrop = group.some((s) => s.type !== "pickup");
//             const approx = group.some((s) => s.geo.accuracy === "area");
//             const marker = new maps.Marker({
//                 map, position,
//                 icon: pinIcon(maps, { kind: hasPickup && hasDrop ? "both" : hasPickup ? "pickup" : "drop", text: groupLabel(group), approx }),
//                 title: group.map(stopTitle).join(" + ") + (approx ? " (approximate)" : ""),
//                 zIndex: hasPickup ? 30 : 20,
//             });
//             marker.addListener("click", () => {
//                 const box = document.createElement("div");
//                 box.style.cssText = "font:13px system-ui,sans-serif;max-width:280px";
//                 group.forEach((s, i) => {
//                     const item = document.createElement("div");
//                     if (i) item.style.cssText = "margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0";
//                     const head = document.createElement("strong");
//                     head.textContent = `${stopTitle(s)}${s.partyName ? ` · ${s.partyName}` : ""}`;
//                     item.appendChild(head);
//                     const addr = document.createElement("div");
//                     addr.textContent = s.address?.text || "";
//                     item.appendChild(addr);
//                     if (s.geo.accuracy === "area") {
//                         const note = document.createElement("div");
//                         note.style.color = "#92400e";
//                         note.textContent = "Approximate location (town or area level)";
//                         item.appendChild(note);
//                     }
//                     box.appendChild(item);
//                 });
//                 info.setContent(box); // DOM nodes, so address text is never parsed as HTML
//                 info.open({ map, anchor: marker });
//             });
//             overlaysRef.current.push(marker);
//             bounds.extend(position);
//         });
//         const uniquePlaces = groups.size;

//         // Road route from the Routes API when we have it; otherwise straight dashed links in stop order.
//         const roadPath = route?.polyline ? decodePolyline(route.polyline) : [];
//         if (roadPath.length > 1) {
//             overlaysRef.current.push(new maps.Polyline({ map, path: roadPath, strokeColor: "#2563eb", strokeOpacity: 0.85, strokeWeight: 5, zIndex: 1 }));
//             roadPath.forEach((p) => bounds.extend(p));
//         } else if (path.length > 1) {
//             const line = new maps.Polyline({
//                 map, path, strokeOpacity: 0, geodesic: true,
//                 icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, strokeColor: "#64748b", scale: 3 }, offset: "0", repeat: "14px" }],
//             });
//             overlaysRef.current.push(line);
//         }

//         if (vehicle && typeof vehicle.lat === "number") {
//             const position = { lat: vehicle.lat, lng: vehicle.lng };
//             overlaysRef.current.push(new maps.Marker({
//                 map, position, title: vehicle.label || "Vehicle", zIndex: 999,
//                 icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: COLORS.vehicle, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 },
//             }));
//             bounds.extend(position);
//         }

//         if (!bounds.isEmpty()) {
//             map.fitBounds(bounds, { top: 80, right: 60, bottom: 40, left: 60 }); // extra room on top so tall pins are not clipped
//             if (uniquePlaces + (vehicle ? 1 : 0) === 1) maps.event.addListenerOnce(map, "idle", () => map.setZoom(Math.min(map.getZoom() || 12, 12)));
//         } else {
//             map.setCenter(INDIA_CENTER); map.setZoom(5);
//         }
//     }, [ready, stops, vehicle, route]);

//     if (!BROWSER_KEY) return fallback;

//     const located = stops.filter((s) => s.geo && typeof s.geo.lat === "number").length;
//     return (
//         <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
//             <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yellow-500 bg-yellow-400 px-4 py-2.5">
//                 <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">Live location tracking</h2>
//                 <span className="rounded-full border border-yellow-600/30 bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-900">
//                     {status || (stops.length ? `${located} of ${stops.length} stops located` : "Select a loading")}
//                 </span>
//             </div>
//             {error && <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
//             <div ref={boxRef} className="h-[28rem] w-full bg-slate-100" />
//             <div className="flex flex-wrap gap-4 border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
//                 <span><b className="text-green-600">●</b> Pickup (P)</span>
//                 <span><b className="text-red-600">●</b> Drop (number = # in the stops table)</span>
//                 <span><b className="text-slate-700">●</b> Several stops at one place (all numbers shown)</span>
//                 <span>Dashed ring = approximate (town level)</span>
//                 {vehicle && <span><b className="text-blue-600">●</b> Vehicle</span>}
//                 <span>{route?.polyline ? "Blue line = driving route in stop order." : "Dashed line joins stops in order; it is not the road route."}</span>
//             </div>
//             {route && (
//                 <div className="grid gap-px border-t border-slate-200 bg-slate-200 text-sm sm:grid-cols-4">
//                     {[
//                         ["Route distance", `${route.distanceKm} km`],
//                         ["Driving time (truck est.)", hoursText(route.plan.drivingHours)],
//                         ["Expected days", `${route.plan.expectedDays} day${route.plan.expectedDays === 1 ? "" : "s"}`],
//                         ["Expected delivery date", dateText(route.plan.expectedDate)],
//                     ].map(([label, value]) => (
//                         <div key={label} className="bg-yellow-50 px-4 py-2.5">
//                             <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
//                             <div className="font-bold text-slate-900">{value}</div>
//                         </div>
//                     ))}
//                 </div>
//             )}
//         </section>
//     );
// }


"use client";
// Google Maps JavaScript map for the Tracking Plan page.
// Browser key: NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY, restricted in Google Cloud to your site's domain (HTTP referrers)
// and to the Maps JavaScript API only. It is read when the app is built, so restart/rebuild after setting it.
import { useEffect, useRef, useState } from "react";

const BROWSER_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
const INDIA_CENTER = { lat: 22.9734, lng: 78.6569 };

// Load the Maps script once per page, however many times the component mounts.
let mapsPromise = null;
function loadMaps() {
    if (typeof window === "undefined") return Promise.reject(new Error("no window"));
    if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
    if (!mapsPromise) {
        mapsPromise = new Promise((resolve, reject) => {
            window.__trackingMapsReady = () => resolve(window.google.maps);
            // Google calls this when the key is rejected (wrong referrer, API not enabled, billing off)
            window.gm_authFailure = () => reject(new Error("AUTH_FAILURE"));
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(BROWSER_KEY)}&v=weekly&loading=async&callback=__trackingMapsReady`;
            script.async = true;
            script.onerror = () => reject(new Error("SCRIPT_FAILED"));
            document.head.appendChild(script);
        }).catch((err) => { mapsPromise = null; throw err; });
    }
    return mapsPromise;
}

const COLORS = { vehicle: "#2563eb" };
const PIN = { pickup: "#16a34a", drop: "#dc2626", both: "#334155" }; // green = pickup, red = drop, dark = pickup and drop at one place

// Compact pin: a small teardrop for one stop, a rounded badge with a pointer when several stops share a place
// (so "2,3" stays readable). Drawn as SVG so the label is always centred. approx: dashed ring = town-level position.
function pinIcon(maps, { kind, text, approx }) {
    const color = PIN[kind];
    const long = text.length > 2;
    const w = long ? Math.min(54, 14 + text.length * 7) : 28;
    const h = long ? 30 : 36;
    const cx = w / 2;
    const fs = long ? 11 : 12;
    const body = long
        ? `<path d="M7 1.5H${w - 7}a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H${cx + 4}L${cx} 28 ${cx - 4} 21.5H7a6 6 0 0 1-6-6v-8a6 6 0 0 1 6-6z" fill="${color}" stroke="#ffffff" stroke-width="2"/>`
        : `<path d="M${cx} 34.5S2.5 21 2.5 12.5a11.5 11.5 0 0 1 23 0C25.5 21 ${cx} 34.5 ${cx} 34.5z" fill="${color}" stroke="#ffffff" stroke-width="2"/>`;
    const labelY = long ? 11.5 : 12.5;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
        `<defs><filter id="s" x="-30%" y="-20%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.35"/></filter></defs>` +
        `<g filter="url(#s)">${body}</g>` +
        (long ? "" : `<circle cx="${cx}" cy="12.5" r="8" fill="#ffffff"${approx ? ` stroke="${color}" stroke-width="1.5" stroke-dasharray="2.5 1.5"` : ""}/>`) +
        `<text x="${cx}" y="${labelY}" text-anchor="middle" dominant-baseline="central" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="${fs}" fill="${long ? "#ffffff" : color}">${text}</text>` +
        (long && approx ? `<rect x="3" y="3.5" width="${w - 6}" height="16" rx="5" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="2.5 1.5"/>` : "") +
        `</svg>`;
    return { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, scaledSize: new maps.Size(w, h), anchor: new maps.Point(cx, h - 1) };
}
// Label for one or more stops at the same place: "P", "3" or "2,3" (long lists shortened to "2,3+2")
function groupLabel(group) {
    const labels = group.map((s) => (s.type === "pickup" ? "P" : String(s.dropNo ?? s.sequence)));
    return labels.length > 3 ? `${labels.slice(0, 2).join(",")}+${labels.length - 2}` : labels.join(",");
}
const stopTitle = (s) => (s.type === "pickup" ? "Pickup" : `Drop ${s.dropNo ?? s.sequence}`);

// Google's encoded polyline -> [{lat, lng}, ...]
function decodePolyline(encoded) {
    const path = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
        for (const axis of ["lat", "lng"]) {
            let shift = 0, result = 0, byte;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20 && index < encoded.length + 1);
            const delta = result & 1 ? ~(result >> 1) : result >> 1;
            if (axis === "lat") lat += delta; else lng += delta;
        }
        path.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return path;
}
const hoursText = (h) => (h >= 24 ? `${Math.floor(h / 24)} d ${Math.round(h % 24)} h` : `${Math.round(h * 10) / 10} h`);
const dateText = (iso) => { const [y, m, d] = String(iso || "").split("-"); return y && m && d ? `${d}/${m}/${y}` : "—"; };

// stops: [{ sequence, type: "pickup"|"drop", partyName, orderNo, address: { text }, geo: { lat, lng, accuracy } | null }]
// vehicle: { lat, lng, label? } | null (live location, added later)
// route: the answer from /api/tracking/route ({ distanceKm, durationMinutes, polyline, plan }) | null
// fallback: shown when there is no browser key
export default function TrackingMap({ stops = [], vehicle = null, route = null, status = "", fallback = null }) {
    const boxRef = useRef(null);
    const mapRef = useRef(null);
    const overlaysRef = useRef([]);
    const fitRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");
    const hasLocated = stops.some((s) => s.geo && typeof s.geo.lat === "number");

    // Create the map only once there is something to show. Opening the page (or selecting a loading that
    // has no located stops) no longer loads a map, and each map load is a billable Maps JavaScript request.
    useEffect(() => {
        if (!BROWSER_KEY || !hasLocated || mapRef.current) return;
        let alive = true;
        const first = stops.find((s) => s.geo && typeof s.geo.lat === "number");
        loadMaps()
            .then(async (maps) => {
                const { Map } = await maps.importLibrary("maps");
                if (!alive || !boxRef.current || mapRef.current) return;
                // Start on the first stop so the map never flashes the whole of India before fitting the route
                mapRef.current = new Map(boxRef.current, { center: { lat: first.geo.lat, lng: first.geo.lng }, zoom: 8, streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false });
                setReady(true);
            })
            .catch((err) => {
                if (alive) setError(err.message === "AUTH_FAILURE"
                    ? "Google rejected the map key. Check the domain restriction, that Maps JavaScript API is enabled, and that billing is on."
                    : "The Google Maps script could not be loaded.");
            });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasLocated]);

    // Refit when the map box changes size (fullscreen, window resize) so the route keeps filling the view
    useEffect(() => {
        if (!ready || !boxRef.current || typeof ResizeObserver === "undefined") return;
        let timer;
        const ro = new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(() => fitRef.current?.(), 150); });
        ro.observe(boxRef.current);
        return () => { clearTimeout(timer); ro.disconnect(); };
    }, [ready]);

    // Redraw markers whenever the stops, the vehicle or the route change
    useEffect(() => {
        const map = mapRef.current;
        if (!ready || !map) return;
        const maps = window.google.maps;
        overlaysRef.current.forEach((o) => o.setMap(null));
        overlaysRef.current = [];

        const bounds = new maps.LatLngBounds();
        const info = new maps.InfoWindow();
        const located = stops.filter((s) => s.geo && typeof s.geo.lat === "number");
        const path = located.map((s) => ({ lat: s.geo.lat, lng: s.geo.lng }));

        // Stops within ~11 m of each other share one pin, so they never sit on top of each other
        const groups = new Map();
        located.forEach((s) => {
            const key = `${s.geo.lat.toFixed(4)},${s.geo.lng.toFixed(4)}`;
            groups.set(key, [...(groups.get(key) || []), s]);
        });

        groups.forEach((group) => {
            const position = { lat: group[0].geo.lat, lng: group[0].geo.lng };
            const hasPickup = group.some((s) => s.type === "pickup");
            const hasDrop = group.some((s) => s.type !== "pickup");
            const approx = group.some((s) => s.geo.accuracy === "area");
            const marker = new maps.Marker({
                map, position,
                icon: pinIcon(maps, { kind: hasPickup && hasDrop ? "both" : hasPickup ? "pickup" : "drop", text: groupLabel(group), approx }),
                title: group.map(stopTitle).join(" + ") + (approx ? " (approximate)" : ""),
                zIndex: hasPickup ? 30 : 20,
            });
            marker.addListener("click", () => {
                const box = document.createElement("div");
                box.style.cssText = "font:13px system-ui,sans-serif;max-width:280px";
                group.forEach((s, i) => {
                    const item = document.createElement("div");
                    if (i) item.style.cssText = "margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0";
                    const head = document.createElement("strong");
                    head.textContent = `${stopTitle(s)}${s.partyName ? ` · ${s.partyName}` : ""}`;
                    item.appendChild(head);
                    const addr = document.createElement("div");
                    addr.textContent = s.address?.text || "";
                    item.appendChild(addr);
                    if (s.geo.accuracy === "area") {
                        const note = document.createElement("div");
                        note.style.color = "#92400e";
                        note.textContent = "Approximate location (town or area level)";
                        item.appendChild(note);
                    }
                    box.appendChild(item);
                });
                info.setContent(box); // DOM nodes, so address text is never parsed as HTML
                info.open({ map, anchor: marker });
            });
            overlaysRef.current.push(marker);
            bounds.extend(position);
        });
        const uniquePlaces = groups.size;

        // Road route from the Routes API when we have it; otherwise straight dashed links in stop order.
        const roadPath = route?.polyline ? decodePolyline(route.polyline) : [];
        if (roadPath.length > 1) {
            overlaysRef.current.push(new maps.Polyline({ map, path: roadPath, strokeColor: "#2563eb", strokeOpacity: 0.85, strokeWeight: 5, zIndex: 1 }));
            roadPath.forEach((p) => bounds.extend(p));
        } else if (path.length > 1) {
            const line = new maps.Polyline({
                map, path, strokeOpacity: 0, geodesic: true,
                icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, strokeColor: "#64748b", scale: 3 }, offset: "0", repeat: "14px" }],
            });
            overlaysRef.current.push(line);
        }

        if (vehicle && typeof vehicle.lat === "number") {
            const position = { lat: vehicle.lat, lng: vehicle.lng };
            overlaysRef.current.push(new maps.Marker({
                map, position, title: vehicle.label || "Vehicle", zIndex: 999,
                icon: { path: maps.SymbolPath.CIRCLE, scale: 9, fillColor: COLORS.vehicle, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 },
            }));
            bounds.extend(position);
        }

        // Zoom so the whole route (pins + road line) fills the map box, with a small margin for the pins.
        // Single place: city-level zoom. Very short routes: never zoom closer than street level.
        const single = uniquePlaces + (vehicle ? 1 : 0) === 1;
        const fit = () => {
            if (bounds.isEmpty()) { map.setCenter(INDIA_CENTER); map.setZoom(5); return; }
            map.fitBounds(bounds, { top: 48, right: 36, bottom: 24, left: 36 });
            maps.event.addListenerOnce(map, "idle", () => { const cap = single ? 12 : 15; if ((map.getZoom() || 0) > cap) map.setZoom(cap); });
        };
        fitRef.current = fit;
        fit();
    }, [ready, stops, vehicle, route]);

    if (!BROWSER_KEY) return fallback;

    const located = stops.filter((s) => s.geo && typeof s.geo.lat === "number").length;
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yellow-500 bg-yellow-400 px-4 py-2.5">
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">Live location tracking</h2>
                <span className="rounded-full border border-yellow-600/30 bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-900">
                    {status || (stops.length ? `${located} of ${stops.length} stops located` : "Select a loading")}
                </span>
            </div>
            {error && <div role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
            <div className="relative">
                <div ref={boxRef} className="h-[28rem] w-full bg-slate-100" />
                {!hasLocated && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">{stops.length ? "Locating stops…" : "Select a loading to see its route"}</div>}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-slate-200 px-4 py-2 text-xs text-slate-600">
                <span><b className="text-green-600">●</b> Pickup (P)</span>
                <span><b className="text-red-600">●</b> Drop (1, 2, 3… in delivery order)</span>
                <span><b className="text-slate-700">●</b> Several stops at one place (all numbers shown)</span>
                <span>Dashed ring = approximate (town level)</span>
                {vehicle && <span><b className="text-blue-600">●</b> Vehicle</span>}
                <span>{route?.polyline ? "Blue line = driving route in stop order." : "Dashed line joins stops in order; it is not the road route."}</span>
            </div>
            {route && (
                <div className="grid gap-px border-t border-slate-200 bg-slate-200 text-sm sm:grid-cols-4">
                    {[
                        ["Route distance", `${route.distanceKm} km`],
                        ["Driving time (truck est.)", hoursText(route.plan.drivingHours)],
                        ["Expected days", `${route.plan.expectedDays} day${route.plan.expectedDays === 1 ? "" : "s"}`],
                        ["Expected delivery date", dateText(route.plan.expectedDate)],
                    ].map(([label, value]) => (
                        <div key={label} className="bg-yellow-50 px-4 py-2.5">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
                            <div className="font-bold text-slate-900">{value}</div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}