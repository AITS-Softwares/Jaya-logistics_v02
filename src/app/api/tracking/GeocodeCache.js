// Tracking-owned cache of geocoding results, keyed by a hash of the normalised address text.
// Nothing else in the app reads or writes this collection.
import mongoose from "mongoose";

const geocodeCacheSchema = new mongoose.Schema(
    {
        companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
        hash: { type: String, required: true },          // sha256 of the normalised address text
        query: { type: String, default: "" },            // normalised text that was hashed (for debugging)
        status: { type: String, enum: ["ok", "not_found"], required: true },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        placeId: { type: String, default: "" },
        formattedAddress: { type: String, default: "" },
        accuracy: { type: String, enum: ["precise", "area", ""], default: "" },
        step: { type: String, default: "" },             // which query found it: full | city+pin | city
        geocodedAt: { type: Date, default: Date.now },
        // MongoDB deletes the document when this date passes (TTL index below).
        expiresAt: { type: Date, required: true },
    },
    { collection: "tracking_geocode_cache", versionKey: false }
);

geocodeCacheSchema.index({ companyId: 1, hash: 1 }, { unique: true });
geocodeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.TrackingGeocodeCache ||
    mongoose.model("TrackingGeocodeCache", geocodeCacheSchema);
