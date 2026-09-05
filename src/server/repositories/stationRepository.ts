import { getDb, schema, isProductionEnvironment } from "../../db";
import { METRO_STATIONS } from "../../data/stations";
import { MetroStation } from "../../types/station";
import { haversineDistanceKm } from "../../lib/geo/haversine";
import { Coordinates } from "../../types/geo";

export class StationRepository {
  async getAllStations(): Promise<MetroStation[]> {
    const db = getDb();
    if (!db) {
      return METRO_STATIONS;
    }

    try {
      const records = await db.select().from(schema.metroStations);
      if (records.length === 0) {
        return METRO_STATIONS;
      }

      const stationLineRecords = await db.select().from(schema.stationLines);
      const interchangeRecords = await db.select().from(schema.interchanges);

      return records.map((rec) => {
        const lines = stationLineRecords
          .filter((sl) => sl.stationId === rec.id)
          .map((sl) => sl.lineId as any);

        const stationInterchanges = interchangeRecords
          .filter((ic) => ic.fromStationId === rec.id)
          .map((ic) => ({
            targetStationId: ic.toStationId,
            targetLineId: "green" as any, // resolved during network graph traversal
            estimatedTransferMinutes: ic.estimatedTransferSeconds
              ? Math.round(ic.estimatedTransferSeconds / 60)
              : 4,
            confidence: ic.confidence as any,
          }));

        return {
          id: rec.id,
          name: rec.name,
          bengaliName: rec.bengaliName || undefined,
          coordinates: {
            latitude: rec.latitude,
            longitude: rec.longitude,
          },
          lineIds: lines.length > 0 ? lines : ["blue"],
          isInterchange: stationInterchanges.length > 0,
          interchangeConnections: stationInterchanges.length > 0 ? stationInterchanges : undefined,
          confidence: rec.dataConfidence as any,
          openedYear: rec.openedYear || undefined,
        };
      });
    } catch (error) {
      if (isProductionEnvironment() && process.env.DATABASE_URL) {
        console.error("[StationRepository] PostgreSQL query error in production:", error);
        throw error;
      }
      console.warn("[StationRepository] Falling back to fixtures due to database error:", error);
      return METRO_STATIONS;
    }
  }

  async getStationById(id: string): Promise<MetroStation | null> {
    const stations = await this.getAllStations();
    return stations.find((s) => s.id === id) || null;
  }

  async findNearby(coords: Coordinates, limit: number = 5) {
    const stations = await this.getAllStations();
    const scored = stations.map((station) => {
      const distanceKm = haversineDistanceKm(coords, station.coordinates);
      const estimatedWalkMinutes = Math.max(1, Math.round((distanceKm / 4.8) * 60));
      return {
        station,
        distanceKm,
        estimatedWalkMinutes,
        confidence: station.confidence,
      };
    });

    scored.sort((a, b) => a.distanceKm - b.distanceKm);
    return scored.slice(0, limit);
  }
}

export const stationRepository = new StationRepository();
