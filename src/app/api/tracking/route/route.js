// // POST /api/tracking/route
// // Body: { origin?: {lat,lng}, stops: [{lat,lng}, ...] }  stops are in driving order; the last one is the final drop.
// //   origin is the vehicle's position when known (live location); otherwise the first stop is the start.
// // Returns total distance and duration, per-leg distance and duration, and a planning ETA.
// // Google Routes API computeRoutes, field mask limited to distance + duration. Cached for a few minutes.
// import { NextResponse } from "next/server";
// import crypto from "crypto";
// import { withAuth } from "@/lib/auth";

// const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
// const FIELD_MASK = "routes.distanceMeters,routes.duration,routes.legs.distanceMeters,routes.legs.duration,routes.polyline.encodedPolyline";
// const MAX_POINTS = 27;            // origin + up to 25 intermediates + destination
// const CACHE_MS = 5 * 60 * 1000;   // "a few minutes"
// const CACHE_MAX = 200;
// const TIMEOUT_MS = 10000;

// // Planning assumptions for a loaded truck. Google's driving time is for a car, so it is stretched
// // and spread over a driving day. CONFIRM THESE with operations before relying on the dates.
// const TRUCK_TIME_FACTOR = 1.3;    // truck takes ~30% longer than the car estimate
// const DRIVING_HOURS_PER_DAY = 10; // hours actually driven per day

// const cache = new Map(); // key -> { at, value }  (per server instance)

// const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
// const point = (p) => {
//     if (p?.lat == null || p?.lng == null || p.lat === "" || p.lng === "") return null; // Number(null) would be 0
//     const lat = num(Number(p.lat)), lng = num(Number(p.lng));
//     return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
// };
// const waypoint = (p) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
// const seconds = (d) => parseInt(String(d || "0").replace("s", ""), 10) || 0; // Google sends "1234s"
// const km = (m) => Math.round((m || 0) / 100) / 10;

// function plan(totalSeconds) {
//     const drivingHours = (totalSeconds / 3600) * TRUCK_TIME_FACTOR;
//     const expectedDays = Math.max(1, Math.ceil(drivingHours / DRIVING_HOURS_PER_DAY));
//     const date = new Date();
//     date.setDate(date.getDate() + expectedDays);
//     return { drivingHours: Math.round(drivingHours * 10) / 10, expectedDays, expectedDate: date.toISOString().slice(0, 10), assumptions: { TRUCK_TIME_FACTOR, DRIVING_HOURS_PER_DAY } };
// }

// export const POST = withAuth(async (req) => {
//     const key = process.env.ROUTES_API_KEY || process.env.GOOGLE_MAPS_SERVER_KEY;
//     if (!key) {
//         return NextResponse.json({ success: false, code: "NOT_CONFIGURED", message: "No server Google key is set (ROUTES_API_KEY or GOOGLE_MAPS_SERVER_KEY)" }, { status: 503 });
//     }
//     try {
//         const body = await req.json().catch(() => ({}));
//         const stops = (Array.isArray(body.stops) ? body.stops : []).map(point);
//         if (stops.some((s) => !s)) return NextResponse.json({ success: false, message: "Every stop needs a valid lat and lng" }, { status: 400 });
//         const origin = body.origin ? point(body.origin) : null;
//         if (body.origin && !origin) return NextResponse.json({ success: false, message: "origin needs a valid lat and lng" }, { status: 400 });

//         const path = origin ? [origin, ...stops] : stops;
//         if (path.length < 2) return NextResponse.json({ success: false, code: "NEED_TWO_POINTS", message: "At least two located points are needed to plan a route" }, { status: 400 });
//         if (path.length > MAX_POINTS) return NextResponse.json({ success: false, message: `At most ${MAX_POINTS} points per route` }, { status: 400 });

//         // Round to ~11 m so a vehicle that barely moved reuses the cached answer
//         const cacheKey = crypto.createHash("sha256").update(path.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|")).digest("hex");
//         const hit = cache.get(cacheKey);
//         if (hit && Date.now() - hit.at < CACHE_MS) {
//             return NextResponse.json({ success: true, data: { ...hit.value, cached: true } });
//         }

//         const controller = new AbortController();
//         const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
//         let res;
//         try {
//             res = await fetch(ENDPOINT, {
//                 method: "POST",
//                 signal: controller.signal,
//                 cache: "no-store",
//                 headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
//                 body: JSON.stringify({
//                     origin: waypoint(path[0]),
//                     destination: waypoint(path[path.length - 1]),
//                     intermediates: path.slice(1, -1).map(waypoint),
//                     travelMode: "DRIVE",
//                     polylineQuality: "OVERVIEW",
//                     languageCode: "en-IN",
//                 }),
//             });
//         } finally {
//             clearTimeout(timer);
//         }
//         const data = await res.json().catch(() => ({}));
//         if (!res.ok) {
//             console.error("tracking/route Google error:", res.status, data?.error?.status, data?.error?.message);
//             return NextResponse.json({ success: false, code: "GOOGLE_ERROR", message: data?.error?.message || "Google Routes request failed" }, { status: 502 });
//         }
//         const route = data.routes?.[0];
//         if (!route) return NextResponse.json({ success: false, code: "ROUTE_NOT_FOUND", message: "No driving route between these points" }, { status: 404 });

//         const totalSeconds = seconds(route.duration);
//         const value = {
//             distanceKm: km(route.distanceMeters),
//             durationMinutes: Math.round(totalSeconds / 60),
//             legs: (route.legs || []).map((l) => ({ distanceKm: km(l.distanceMeters), durationMinutes: Math.round(seconds(l.duration) / 60) })),
//             plan: plan(totalSeconds),
//             polyline: route.polyline?.encodedPolyline || "",
//         };
//         if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // drop the oldest
//         cache.set(cacheKey, { at: Date.now(), value });
//         return NextResponse.json({ success: true, data: { ...value, cached: false } });
//     } catch (err) {
//         console.error("tracking/route error:", err);
//         return NextResponse.json({ success: false, message: "Unable to plan the route" }, { status: err?.name === "AbortError" ? 504 : 500 });
//     }
// }, { module: "Tracking Plan", action: "view" });

// POST /api/tracking/route
// Body: { origin?: {lat,lng}, stops: [{lat,lng}, ...] }  stops are in driving order; the last one is the final drop.
//   origin is the vehicle's position when known (live location); otherwise the first stop is the start.
// Returns total distance and duration, per-leg distance and duration, and a planning ETA.
// Google Routes API computeRoutes, field mask limited to distance + duration. Cached for a few minutes.
import { NextResponse } from "next/server";
import crypto from "crypto";
import { withAuth } from "@/lib/auth";

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = "routes.distanceMeters,routes.duration,routes.legs.distanceMeters,routes.legs.duration,routes.polyline.encodedPolyline";
const MAX_POINTS = 27;            // origin + up to 25 intermediates + destination
const CACHE_MS = 5 * 60 * 1000;   // live-vehicle routes (origin given) change as the truck moves
const STATIC_CACHE_MS = 6 * 60 * 60 * 1000; // a fixed plan (no origin) is the same road all day, so keep it for hours
const RATE_LIMIT = 20;            // Routes requests per user per minute (cache hits are free and not counted)
const RATE_WINDOW_MS = 60 * 1000;
const CACHE_MAX = 200;
const TIMEOUT_MS = 10000;

// Planning assumptions for a loaded truck. Google's driving time is for a car, so it is stretched
// and spread over a driving day. CONFIRM THESE with operations before relying on the dates.
const TRUCK_TIME_FACTOR = 1.3;    // truck takes ~30% longer than the car estimate
const DRIVING_HOURS_PER_DAY = 10; // hours actually driven per day

const cache = new Map(); // key -> { at, value }  (per server instance)
const hits = new Map();  // userId -> [timestamps]  (per server instance)
function overLimit(userId) {
    const now = Date.now();
    const recent = (hits.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) { hits.set(userId, recent); return true; }
    recent.push(now); hits.set(userId, recent);
    if (hits.size > 1000) hits.delete(hits.keys().next().value);
    return false;
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const point = (p) => {
    if (p?.lat == null || p?.lng == null || p.lat === "" || p.lng === "") return null; // Number(null) would be 0
    const lat = num(Number(p.lat)), lng = num(Number(p.lng));
    return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};
const waypoint = (p) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
const seconds = (d) => parseInt(String(d || "0").replace("s", ""), 10) || 0; // Google sends "1234s"
const km = (m) => Math.round((m || 0) / 100) / 10;

function plan(totalSeconds) {
    const drivingHours = (totalSeconds / 3600) * TRUCK_TIME_FACTOR;
    const expectedDays = Math.max(1, Math.ceil(drivingHours / DRIVING_HOURS_PER_DAY));
    const date = new Date();
    date.setDate(date.getDate() + expectedDays);
    return { drivingHours: Math.round(drivingHours * 10) / 10, expectedDays, expectedDate: date.toISOString().slice(0, 10), assumptions: { TRUCK_TIME_FACTOR, DRIVING_HOURS_PER_DAY } };
}

export const POST = withAuth(async (req, context, user) => {
    const key = process.env.ROUTES_API_KEY || process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
        return NextResponse.json({ success: false, code: "NOT_CONFIGURED", message: "No server Google key is set (ROUTES_API_KEY or GOOGLE_MAPS_SERVER_KEY)" }, { status: 503 });
    }
    try {
        const body = await req.json().catch(() => ({}));
        const stops = (Array.isArray(body.stops) ? body.stops : []).map(point);
        if (stops.some((s) => !s)) return NextResponse.json({ success: false, message: "Every stop needs a valid lat and lng" }, { status: 400 });
        const origin = body.origin ? point(body.origin) : null;
        if (body.origin && !origin) return NextResponse.json({ success: false, message: "origin needs a valid lat and lng" }, { status: 400 });

        // Consecutive points at the same place add no road; drop them before asking Google
        const same = (a, b) => a.lat.toFixed(4) === b.lat.toFixed(4) && a.lng.toFixed(4) === b.lng.toFixed(4);
        const path = (origin ? [origin, ...stops] : stops).filter((p, i, a) => i === 0 || !same(p, a[i - 1]));
        if (path.length < 2) return NextResponse.json({ success: false, code: "NEED_TWO_POINTS", message: "At least two located points are needed to plan a route" }, { status: 400 });
        if (path.length > MAX_POINTS) return NextResponse.json({ success: false, message: `At most ${MAX_POINTS} points per route` }, { status: 400 });

        // Round to ~11 m so a vehicle that barely moved reuses the cached answer
        const cacheKey = crypto.createHash("sha256").update(path.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|")).digest("hex");
        const hit = cache.get(cacheKey);
        if (hit && Date.now() - hit.at < (origin ? CACHE_MS : STATIC_CACHE_MS)) {
            return NextResponse.json({ success: true, data: { ...hit.value, plan: plan(hit.value.totalSeconds), cached: true } }); // plan recomputed so the expected date is always from today
        }
        // Only real Google calls count against the limit
        if (overLimit(String(user?._id || user?.id || user?.userId || "anon"))) {
            return NextResponse.json({ success: false, code: "RATE_LIMITED", message: "Too many route requests. Please wait a minute and try again." }, { status: 429 });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let res;
        try {
            res = await fetch(ENDPOINT, {
                method: "POST",
                signal: controller.signal,
                cache: "no-store",
                headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
                body: JSON.stringify({
                    origin: waypoint(path[0]),
                    destination: waypoint(path[path.length - 1]),
                    intermediates: path.slice(1, -1).map(waypoint),
                    travelMode: "DRIVE",
                    polylineQuality: "OVERVIEW",
                    languageCode: "en-IN",
                }),
            });
        } finally {
            clearTimeout(timer);
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            console.error("tracking/route Google error:", res.status, data?.error?.status, data?.error?.message);
            return NextResponse.json({ success: false, code: "GOOGLE_ERROR", message: data?.error?.message || "Google Routes request failed" }, { status: 502 });
        }
        const route = data.routes?.[0];
        if (!route) return NextResponse.json({ success: false, code: "ROUTE_NOT_FOUND", message: "No driving route between these points" }, { status: 404 });

        const totalSeconds = seconds(route.duration);
        const value = {
            distanceKm: km(route.distanceMeters),
            durationMinutes: Math.round(totalSeconds / 60),
            totalSeconds,
            legs: (route.legs || []).map((l) => ({ distanceKm: km(l.distanceMeters), durationMinutes: Math.round(seconds(l.duration) / 60) })),
            plan: plan(totalSeconds),
            polyline: route.polyline?.encodedPolyline || "",
        };
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // drop the oldest
        cache.set(cacheKey, { at: Date.now(), value });
        return NextResponse.json({ success: true, data: { ...value, cached: false } });
    } catch (err) {
        console.error("tracking/route error:", err);
        return NextResponse.json({ success: false, message: "Unable to plan the route" }, { status: err?.name === "AbortError" ? 504 : 500 });
    }
}, { module: "Tracking Plan", action: "view" });