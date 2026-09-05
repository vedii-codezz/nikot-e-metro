import { GeocodingResult } from "../../types/geo";
import { KOLKATA_LANDMARKS } from "../../data/landmarks";
import { METRO_STATIONS } from "../../data/stations";

/**
 * Common Geocoder interface
 */
export interface Geocoder {
  search(query: string): Promise<GeocodingResult[]>;
}

/**
 * In-memory Curated Local Geocoder
 * Matches against curated Kolkata landmarks, station names, Bengali names, and station landmark aliases.
 */
export class CuratedLocalGeocoder implements Geocoder {
  async search(query: string): Promise<GeocodingResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: GeocodingResult[] = [];

    // 1. Search stations first
    for (const station of METRO_STATIONS) {
      const matchName = station.name.toLowerCase().includes(q);
      const matchBengali = station.bengaliName && station.bengaliName.includes(q);
      const matchLandmark = station.nearbyLandmarks?.some((lm) => lm.toLowerCase().includes(q));

      if (matchName || matchBengali || matchLandmark) {
        results.push({
          id: `st_${station.id}`,
          name: `${station.name} Metro Station`,
          bengaliName: station.bengaliName ? `${station.bengaliName} মেট্রো স্টেশন` : undefined,
          coordinates: station.coordinates,
          type: "station",
          description: `Metro Station (${station.lineIds.map((l) => l.toUpperCase()).join(" / ")} Line)`,
          source: "station",
        });
      }
    }

    // 2. Search curated landmarks
    for (const lm of KOLKATA_LANDMARKS) {
      const matchName = lm.name.toLowerCase().includes(q);
      const matchBengali = lm.bengaliName && lm.bengaliName.includes(q);
      const matchDesc = lm.description && lm.description.toLowerCase().includes(q);

      if (matchName || matchBengali || matchDesc) {
        results.push(lm);
      }
    }

    return results;
  }
}

/**
 * OpenStreetMap Nominatim Geocoder with Kolkata bounding box bias and caching.
 */
export class NominatimGeocoder implements Geocoder {
  private cache = new Map<string, GeocodingResult[]>();
  // Greater Kolkata Bounding Box: [minLng, minLat, maxLng, maxLat]
  private viewbox = "88.15,22.35,88.55,22.75";

  async search(query: string): Promise<GeocodingResult[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    const cacheKey = q.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&viewbox=${this.viewbox}&bounded=0&countrycodes=in&limit=4&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en,bn",
          "User-Agent": "Nikot-e-Metro/1.0",
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const results: GeocodingResult[] = data.map((item: any) => ({
        id: `osm_${item.place_id}`,
        name: item.display_name.split(",")[0] || item.name || q,
        coordinates: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
        type: "address",
        description: item.display_name,
        source: "nominatim",
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch {
      // Graceful fallback on network error
      return [];
    }
  }
}

/**
 * Unified Geocoding Service combining local instant lookup with external fallback
 */
export class UnifiedGeocodingService implements Geocoder {
  private localGeocoder: CuratedLocalGeocoder;
  private remoteGeocoder: NominatimGeocoder;

  constructor() {
    this.localGeocoder = new CuratedLocalGeocoder();
    this.remoteGeocoder = new NominatimGeocoder();
  }

  async search(query: string): Promise<GeocodingResult[]> {
    const q = query.trim();
    if (!q) return [];

    // 1. Search local curated landmarks & stations immediately
    const localResults = await this.localGeocoder.search(q);

    // If we have strong local matches, return them immediately
    if (localResults.length >= 3 || q.length < 3) {
      return localResults.slice(0, 6);
    }

    // 2. Fetch remote OSM Nominatim as fallback
    try {
      const remoteResults = await this.remoteGeocoder.search(q);
      const combined = [...localResults];
      const seenNames = new Set(localResults.map((r) => r.name.toLowerCase()));

      for (const r of remoteResults) {
        if (!seenNames.has(r.name.toLowerCase())) {
          combined.push(r);
          seenNames.add(r.name.toLowerCase());
        }
      }

      return combined.slice(0, 6);
    } catch {
      return localResults;
    }
  }
}

export const geocodingService = new UnifiedGeocodingService();
