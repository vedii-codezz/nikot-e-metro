import { MetroStation, LineId, DataConfidence, StationConnection } from "../../types/station";
import { GraphEdge } from "../../types/routing";
import { haversineDistanceKm } from "../geo/haversine";

/**
 * Average commercial speed of Kolkata Metro including dwell times:
 * Approx 30-35 km/h -> ~2.0 minutes per inter-station segment or ~1.8 min/km.
 */
const DEFAULT_AVG_SPEED_KMH = 32.0;

export interface MetroGraph {
  adjacencyList: Map<string, GraphEdge[]>;
  stationsById: Map<string, MetroStation>;
}

export interface BuildGraphOptions {
  includeNonOperational?: boolean; // default: false (public passenger routing uses operational only)
}

/**
 * Builds a weighted graph from station definitions and connections.
 * In passenger routing mode, only operational edges participate in journey planning.
 */
export function buildMetroGraph(
  stations: MetroStation[],
  connections?: StationConnection[],
  options: BuildGraphOptions = {}
): MetroGraph {
  const includeNonOperational = options.includeNonOperational ?? false;
  const adjacencyList = new Map<string, GraphEdge[]>();
  const stationsById = new Map<string, MetroStation>();

  // Register stations
  for (const station of stations) {
    stationsById.set(station.id, station);
    if (!adjacencyList.has(station.id)) {
      adjacencyList.set(station.id, []);
    }
  }

  // 1. Build track edges from connections if supplied
  if (connections && connections.length > 0) {
    for (const conn of connections) {
      if (!includeNonOperational && conn.routingStatus !== "operational") {
        continue;
      }

      if (!stationsById.has(conn.fromStationId) || !stationsById.has(conn.toStationId)) {
        continue;
      }

      const distKm = conn.distanceMeters / 1000;
      const minutes = conn.estimatedTravelSeconds
        ? Math.round((conn.estimatedTravelSeconds / 60) * 10) / 10
        : Math.max(1.5, Math.round(((distKm / DEFAULT_AVG_SPEED_KMH) * 60 + 0.5) * 10) / 10);

      adjacencyList.get(conn.fromStationId)?.push({
        toStationId: conn.toStationId,
        toLineId: conn.lineId,
        distanceKm: distKm,
        travelMinutes: minutes,
        isInterchange: false,
        confidence: conn.confidence,
        routingStatus: conn.routingStatus,
      });
    }
  } else {
    // Fallback: Group stations by line and sort in natural corridor order
    const lineStationMap = new Map<LineId, MetroStation[]>();

    for (const station of stations) {
      for (const lineId of station.lineIds) {
        if (!lineStationMap.has(lineId)) {
          lineStationMap.set(lineId, []);
        }
        lineStationMap.get(lineId)!.push(station);
      }
    }

    for (const [lineId, lineStations] of lineStationMap.entries()) {
      for (let i = 0; i < lineStations.length - 1; i++) {
        const u = lineStations[i];
        const v = lineStations[i + 1];

        const dist = haversineDistanceKm(u.coordinates, v.coordinates);
        const minutes = Math.max(1.5, Math.round(((dist / DEFAULT_AVG_SPEED_KMH) * 60 + 0.5) * 10) / 10);

        const confidence: DataConfidence =
          u.confidence === "verified" && v.confidence === "verified"
            ? "verified"
            : "development";

        adjacencyList.get(u.id)?.push({
          toStationId: v.id,
          toLineId: lineId,
          distanceKm: dist,
          travelMinutes: minutes,
          isInterchange: false,
          confidence,
          routingStatus: "operational",
        });

        adjacencyList.get(v.id)?.push({
          toStationId: u.id,
          toLineId: lineId,
          distanceKm: dist,
          travelMinutes: minutes,
          isInterchange: false,
          confidence,
          routingStatus: "operational",
        });
      }
    }
  }

  // 2. Add explicit interchange transfer edges
  for (const station of stations) {
    if (station.isInterchange && station.interchangeConnections) {
      for (const conn of station.interchangeConnections) {
        if (!includeNonOperational && conn.routingStatus && conn.routingStatus !== "operational") {
          continue;
        }

        const transferMins = conn.estimatedTransferMinutes ?? 4.0;
        adjacencyList.get(station.id)?.push({
          toStationId: conn.targetStationId,
          toLineId: conn.targetLineId,
          distanceKm: 0.1, // Approximate station concourse walkway
          travelMinutes: transferMins,
          isInterchange: true,
          confidence: conn.confidence,
          routingStatus: conn.routingStatus || "operational",
        });
      }
    }
  }

  return { adjacencyList, stationsById };
}
