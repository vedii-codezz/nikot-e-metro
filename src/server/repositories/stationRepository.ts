import { getDb, schema, isProductionEnvironment } from "../../db";
import { METRO_STATIONS } from "../../data/stations";
import { METRO_LINES } from "../../data/lines";
import { MetroStation, StationConnection } from "../../types/station";
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
          .map((ic) => {
            const targetLineRecord = stationLineRecords.find(
              (sl) => sl.stationId === ic.toStationId
            );
            return {
              targetStationId: ic.toStationId,
              targetLineId: (targetLineRecord?.lineId as any) || "blue",
              estimatedTransferMinutes: ic.estimatedTransferSeconds
                ? Math.round(ic.estimatedTransferSeconds / 60)
                : 4,
              confidence: ic.confidence as any,
              routingStatus: (ic.routingStatus as any) || "operational",
            };
          });

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

  async getAllConnections(): Promise<StationConnection[]> {
    const db = getDb();
    if (!db) {
      return this.getDefaultConnections();
    }

    try {
      const records = await db.select().from(schema.stationConnections);
      if (records.length === 0) {
        return this.getDefaultConnections();
      }

      return records.map((r) => ({
        id: r.id,
        fromStationId: r.fromStationId,
        toStationId: r.toStationId,
        lineId: r.lineId as any,
        distanceMeters: r.distanceMeters,
        estimatedTravelSeconds: r.estimatedTravelSeconds ?? undefined,
        verified: r.verified,
        confidence: r.confidence as any,
        routingStatus: (r.routingStatus as any) || "operational",
      }));
    } catch (error) {
      if (isProductionEnvironment() && process.env.DATABASE_URL) {
        console.error("[StationRepository] getAllConnections error:", error);
        throw error;
      }
      return this.getDefaultConnections();
    }
  }

  private getDefaultConnections(): StationConnection[] {
    const conns: StationConnection[] = [];
    for (const line of METRO_LINES) {
      const lineStations = METRO_STATIONS.filter((s) => s.lineIds.includes(line.id));
      for (let i = 0; i < lineStations.length - 1; i++) {
        const u = lineStations[i];
        const v = lineStations[i + 1];
        const distKm = haversineDistanceKm(u.coordinates, v.coordinates);
        const distMeters = Math.round(distKm * 1000);
        const seconds = Math.round((distKm / 32.0) * 3600 + 30);
        const isBowbazar =
          line.id === "green" &&
          ((u.id === "esplanade_green" && v.id === "sealdah") ||
           (u.id === "sealdah" && v.id === "esplanade_green"));

        const routingStatus = isBowbazar ? "planned" : "operational";

        conns.push({
          id: `conn_${line.id}_${u.id}_${v.id}`,
          fromStationId: u.id,
          toStationId: v.id,
          lineId: line.id,
          distanceMeters: distMeters,
          estimatedTravelSeconds: seconds,
          verified: u.confidence === "verified" && v.confidence === "verified",
          confidence: u.confidence === "verified" && v.confidence === "verified" ? "verified" : "development",
          routingStatus,
        });

        conns.push({
          id: `conn_${line.id}_${v.id}_${u.id}`,
          fromStationId: v.id,
          toStationId: u.id,
          lineId: line.id,
          distanceMeters: distMeters,
          estimatedTravelSeconds: seconds,
          verified: u.confidence === "verified" && v.confidence === "verified",
          confidence: u.confidence === "verified" && v.confidence === "verified" ? "verified" : "development",
          routingStatus,
        });
      }
    }
    return conns;
  }
}

export const stationRepository = new StationRepository();
