import { GeocoderProvider } from "./provider";
import { GeocodingResult } from "../../types/geo";
import { stationRepository } from "../repositories/stationRepository";
import { landmarkRepository } from "../repositories/landmarkRepository";

export class LocalDatabaseGeocoder implements GeocoderProvider {
  async search(query: string, limit: number = 6): Promise<GeocodingResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: GeocodingResult[] = [];

    // 1. Search stations
    const stations = await stationRepository.getAllStations();
    for (const station of stations) {
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

    // 2. Search landmarks
    const landmarks = await landmarkRepository.searchLandmarks(q, limit);
    results.push(...landmarks);

    return results.slice(0, limit);
  }
}
