import { GeocoderProvider } from "./provider";
import { GeocodingResult } from "../../types/geo";

export class ExternalGeocoder implements GeocoderProvider {
  private cache = new Map<string, GeocodingResult[]>();
  private viewbox = "88.15,22.35,88.55,22.75";
  private baseUrl = process.env.GEOCODER_BASE_URL || "https://nominatim.openstreetmap.org";

  async search(query: string, limit: number = 4): Promise<GeocodingResult[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    const cacheKey = q.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const url = `${this.baseUrl}/search?format=json&q=${encodeURIComponent(
        q
      )}&viewbox=${this.viewbox}&bounded=0&countrycodes=in&limit=${limit}&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          "Accept-Language": "en,bn",
          "User-Agent": "Nikot-e-Metro-Server/1.0",
        },
      });

      if (!response.ok) return [];

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
      return [];
    }
  }
}
