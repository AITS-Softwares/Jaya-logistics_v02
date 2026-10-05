// POST /api/tracking/geocode
// Body: { stops: [{ key, text, city?, pin? }] }   (max 25)
// Returns: { results: { [key]: { status, lat, lng, placeId, formattedAddress, accuracy, cached } } }
// Server key: GEOCODING_API_KEY, PLACES_API_KEY or GOOGLE_MAPS_SERVER_KEY. Results are cached in TrackingGeocodeCache.
import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDb from "@/lib/db";
import { withAuth } from "@/lib/auth";
import GeocodeCache from "../GeocodeCache";

const MAX_STOPS = 25;
const CONCURRENCY = 4;
const TIMEOUT_MS = 8000;
// Google limits how long latitude/longitude may be cached (30 days at the time of writing);
// place IDs may be kept longer. Check the current Maps Platform terms before raising this.
const OK_TTL_DAYS = 30;
const MISS_TTL_DAYS = 7; // a failed lookup is retried after a week
const INDIA_BOX = { minLat: 6, maxLat: 37.6, minLng: 68, maxLng: 97.5 };
const DAY = 24 * 60 * 60 * 1000;

const clean = (v) => String(v ?? "").trim();
// Lower-case, strip punctuation, collapse spaces: "Plot 4, MIDC." and "plot 4 midc" share one cache entry.
const normalise = (text) => clean(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const hashOf = (text) => crypto.createHash("sha256").update(text).digest("hex");
const inIndia = (lat, lng) => lat >= INDIA_BOX.minLat && lat <= INDIA_BOX.maxLat && lng >= INDIA_BOX.minLng && lng <= INDIA_BOX.maxLng;

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
// Types that mean a street address or a building, as opposed to a town, pin-code area or road
const PRECISE_TYPES = ["street_address", "premise", "subpremise", "establishment", "point_of_interest"];

async function geocodeOnce(address, key) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(PLACES_URL, {
            method: "POST",
            signal: controller.signal,
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": "places.id,places.location,places.formattedAddress,places.types",
            },
            body: JSON.stringify({
                textQuery: address,
                regionCode: "IN",
                languageCode: "en",
                maxResultCount: 1,
                // Country only: the pin on a row is the order's pin and may not match the town
                locationRestriction: { rectangle: { low: { latitude: INDIA_BOX.minLat, longitude: INDIA_BOX.minLng }, high: { latitude: INDIA_BOX.maxLat, longitude: INDIA_BOX.maxLng } } },
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            // PERMISSION_DENIED, INVALID_ARGUMENT, RESOURCE_EXHAUSTED ...: not a "no such place" answer, so do not cache it
            const err = new Error(data?.error?.message || `Places request failed (${res.status})`);
            err.googleStatus = data?.error?.status || String(res.status);
            throw err;
        }
        const p = data.places?.[0]; // an empty result comes back as {}
        const lat = p?.location?.latitude, lng = p?.location?.longitude;
        if (typeof lat === "number" && typeof lng === "number" && inIndia(lat, lng)) {
            return { found: true, lat, lng, placeId: p.id || "", formattedAddress: p.formattedAddress || "", precise: (p.types || []).some((t) => PRECISE_TYPES.includes(t)) };
        }
        return { found: false };
    } finally {
        clearTimeout(timer);
    }
}

async function geocodeStop(stop, key) {
    const attempts = [{ step: "full", text: clean(stop.text) }];
    const city = clean(stop.city), pin = clean(stop.pin);
    if (city && pin) attempts.push({ step: "city+pin", text: `${city}, ${pin}` });
    if (city) attempts.push({ step: "city", text: city });
    for (const a of attempts) {
        if (!a.text) continue;
        const hit = await geocodeOnce(a.text, key);
        if (!hit.found) continue;
        return { ...hit, step: a.step, accuracy: a.step === "full" && hit.precise ? "precise" : "area" };
    }
    return null;
}

export const POST = withAuth(async (req, context, user) => {
    // Geocoding API must be enabled on whichever key is used here.
    // Places API (New) must be enabled on whichever key is used here.
    const key = process.env.PLACES_API_KEY || process.env.GEOCODING_API_KEY || process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!key) {
        return NextResponse.json({ success: false, code: "NOT_CONFIGURED", message: "No server Google key is set (GEOCODING_API_KEY, PLACES_API_KEY or GOOGLE_MAPS_SERVER_KEY)" }, { status: 503 });
    }
    try {
        const body = await req.json().catch(() => ({}));
        const stops = Array.isArray(body.stops) ? body.stops : [];
        if (!stops.length) return NextResponse.json({ success: false, message: "stops is required" }, { status: 400 });
        if (stops.length > MAX_STOPS) return NextResponse.json({ success: false, message: `At most ${MAX_STOPS} stops per request` }, { status: 400 });

        await connectDb();
        const now = new Date();

        // One lookup per distinct address, however many stops share it
        const groups = new Map(); // hash -> { stop, keys[] }
        for (const s of stops) {
            const k = clean(s.key), norm = normalise(s.text);
            if (!k || !norm) continue;
            const hash = hashOf(norm);
            const g = groups.get(hash) || { stop: s, norm, keys: [] };
            g.keys.push(k);
            groups.set(hash, g);
        }

        const hashes = [...groups.keys()];
        const cached = await GeocodeCache.find({ companyId: user.companyId, hash: { $in: hashes }, expiresAt: { $gt: now } }).lean();
        const cacheByHash = new Map(cached.map((c) => [c.hash, c]));

        const toResult = (c, fromCache) => c.status === "ok"
            ? { status: "ok", lat: c.lat, lng: c.lng, placeId: c.placeId, formattedAddress: c.formattedAddress, accuracy: c.accuracy, cached: fromCache }
            : { status: "not_found", cached: fromCache };

        const results = {};
        const todo = [];
        for (const [hash, g] of groups) {
            const c = cacheByHash.get(hash);
            if (c) g.keys.forEach((k) => { results[k] = toResult(c, true); });
            else todo.push([hash, g]);
        }

        // Look up the misses, a few at a time
        let apiError = null;
        for (let i = 0; i < todo.length; i += CONCURRENCY) {
            await Promise.all(todo.slice(i, i + CONCURRENCY).map(async ([hash, g]) => {
                try {
                    const found = await geocodeStop(g.stop, key);
                    const doc = found
                        ? { status: "ok", lat: found.lat, lng: found.lng, placeId: found.placeId, formattedAddress: found.formattedAddress, accuracy: found.accuracy, step: found.step, expiresAt: new Date(now.getTime() + OK_TTL_DAYS * DAY) }
                        : { status: "not_found", expiresAt: new Date(now.getTime() + MISS_TTL_DAYS * DAY) };
                    try {
                        await GeocodeCache.updateOne(
                            { companyId: user.companyId, hash },
                            { $set: { ...doc, query: g.norm, geocodedAt: now } },
                            { upsert: true }
                        );
                    } catch (saveErr) {
                        // A parallel request saved the same address first (E11000): the lookup itself is still good.
                        if (saveErr?.code !== 11000) console.error("tracking/geocode cache save:", saveErr.message);
                    }
                    g.keys.forEach((k) => { results[k] = toResult(doc, false); });
                } catch (err) {
                    apiError = apiError || err;
                    g.keys.forEach((k) => { results[k] = { status: "error", cached: false }; });
                }
            }));
        }

        if (apiError) console.error("tracking/geocode error:", apiError.googleStatus || "", apiError.message);
        return NextResponse.json({
            success: true,
            data: { results, warning: apiError ? `Some addresses could not be looked up (${apiError.googleStatus || "error"})` : "" },
        });
    } catch (err) {
        console.error("tracking/geocode error:", err);
        return NextResponse.json({ success: false, message: "Unable to geocode addresses" }, { status: 500 });
    }
}, { module: "Tracking Plan", action: "view" });