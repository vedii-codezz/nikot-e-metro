import { LocalDatabaseGeocoder } from "./localDatabaseGeocoder";
import { ExternalGeocoder } from "./externalGeocoder";
import { GeocodingResult } from "../../types/geo";

export class ServerGeocodingService {
  private localGeocoder: LocalDatabaseGeocoder;
  private externalGeocoder: ExternalGeocoder;

  constructor() {
    this.localGeocoder = new LocalDatabaseGeocoder();
    this.externalGeocoder = new ExternalGeocoder();
  }

  async search(query: string, limit: number = 6): Promise<GeocodingResult[]> {
    const q = query.trim();
    if (!q) return [];

    // 1. Search local database / verified stations & landmarks first
    const localResults = await this.localGeocoder.search(q, limit);

    // If local results are sufficient, return them immediately
    if (localResults.length >= 3 || q.length < 3) {
      return localResults.slice(0, limit);
    }

    // 2. Query external fallback if local matches are sparse
    try {
      const externalResults = await this.externalGeocoder.search(q, 4);
      const combined = [...localResults];
      const seenNames = new Set(localResults.map((r) => r.name.toLowerCase()));

      for (const res of externalResults) {
        if (!seenNames.has(res.name.toLowerCase())) {
          combined.push(res);
          seenNames.add(res.name.toLowerCase());
        }
      }

      return combined.slice(0, limit);
    } catch {
      return localResults;
    }
  }
}

export const serverGeocodingService = new ServerGeocodingService();
