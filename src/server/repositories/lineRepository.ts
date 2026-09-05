import { getDb, schema, isProductionEnvironment } from "../../db";
import { METRO_LINES } from "../../data/lines";
import { MetroLine } from "../../types/station";

export class LineRepository {
  async getAllLines(): Promise<MetroLine[]> {
    const db = getDb();
    if (!db) {
      return METRO_LINES;
    }

    try {
      const records = await db.select().from(schema.metroLines);
      if (records.length === 0) {
        return METRO_LINES;
      }

      return records.map((rec) => ({
        id: rec.id as any,
        name: rec.name,
        lineCode: rec.lineCode,
        bengaliName: rec.bengaliName,
        color: rec.displayColor,
        textColor: rec.textColor,
        terminus: ["Dakshineswar", "Kavi Subhash"],
        status: rec.status as any,
        confidence: rec.confidence as any,
      }));
    } catch (error) {
      if (isProductionEnvironment() && process.env.DATABASE_URL) {
        throw error;
      }
      return METRO_LINES;
    }
  }

  async getLineById(id: string): Promise<MetroLine | null> {
    const lines = await this.getAllLines();
    return lines.find((l) => l.id === id) || null;
  }
}

export const lineRepository = new LineRepository();
