// POST /api/tracking/geocode
// Body: { stops: [{ key, text, city?, pin? }] }   (max 25)
// Returns: { results: { [key]: { status, lat, lng, placeId, formattedAddress, accuracy, cached } } }
// Server key: GEOCODING_API_KEY, PLACES_API_KEY or GOOGLE_MAPS_SERVER_KEY. Results are cached in TrackingGeocodeCache.
import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { lookupTrackingStops, trackingGeocodeKey } from "./lookup";

const MAX_STOPS = 25;

const branchHandlerPOST = withAuth(async (req, context, user) => {
    // Geocoding API must be enabled on whichever key is used here.
    // Places API (New) must be enabled on whichever key is used here.
    const key = trackingGeocodeKey();
    if (!key) {
        return NextResponse.json({ success: false, code: "NOT_CONFIGURED", message: "No server Google key is set (GEOCODING_API_KEY, PLACES_API_KEY or GOOGLE_MAPS_SERVER_KEY)" }, { status: 503 });
    }
    try {
        const body = await req.json().catch(() => ({}));
        const stops = Array.isArray(body.stops) ? body.stops : [];
        if (!stops.length) return NextResponse.json({ success: false, message: "stops is required" }, { status: 400 });
        if (stops.length > MAX_STOPS) return NextResponse.json({ success: false, message: `At most ${MAX_STOPS} stops per request` }, { status: 400 });

        return NextResponse.json({ success: true, data: await lookupTrackingStops(stops, user.companyId, key) });
    } catch (err) {
        console.error("tracking/geocode error:", err);
        return NextResponse.json({ success: false, message: "Unable to geocode addresses" }, { status: 500 });
    }
}, { module: "Tracking Plan", action: "view" });
export const POST = withBranchAccess(branchHandlerPOST);
