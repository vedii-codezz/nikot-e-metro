import { getDb, schema, isProductionEnvironment } from "../../db";
import { KOLKATA_LANDMARKS } from "../../data/landmarks";
import { GeocodingResult } from "../../types/geo";

export class LandmarkRepository {
  async searchLandmarks(query: string, limit: number = 6): Promise<GeocodingResult[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const db = getDb();
    if (!db) {
      return KOLKATA_LANDMARKS.filter(
        (lm) =>
          lm.name.toLowerCase().includes(q) ||
          (lm.bengaliName && lm.bengaliName.includes(q)) ||
          (lm.description && lm.description.toLowerCase().includes(q))
      ).slice(0, limit);
    }

    try {
      const records = await db.select().from(schema.landmarks);
      const matches = records.filter(
        (rec) =>
          rec.name.toLowerCase().includes(q) ||
          (rec.bengaliName && rec.bengaliName.includes(q)) ||
          (rec.aliases && rec.aliases.toLowerCase().includes(q)) ||
          (rec.description && rec.description.toLowerCase().includes(q))
      );

      return matches.slice(0, limit).map((rec) => ({
        id: rec.id,
        name: rec.name,
        bengaliName: rec.bengaliName || undefined,
        coordinates: {
          latitude: rec.latitude,
          longitude: rec.longitude,
        },
        type: rec.category as any,
        description: rec.description || undefined,
        source: "curated",
      }));
    } catch (error) {
      if (isProductionEnvironment() && process.env.DATABASE_URL) {
        throw error;
      }
      return KOLKATA_LANDMARKS.filter((lm) => lm.name.toLowerCase().includes(q)).slice(0, limit);
    }
  }
}

export const landmarkRepository = new LandmarkRepository();
