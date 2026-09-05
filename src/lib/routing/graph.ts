import { MetroStation, LineId, DataConfidence } from "../../types/station";
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

/**
 * Builds a weighted graph from station definitions and line sequence connectivity.
 * Adjacent stations on the same line are connected with bidirectional edges.
 * Explicit interchange connections are added as transfer edges.
 */
export function buildMetroGraph(stations: MetroStation[]): MetroGraph {
  const adjacencyList = new Map<string, GraphEdge[]>();
  const stationsById = new Map<string, MetroStation>();

  // Register stations
  for (const station of stations) {
    stationsById.set(station.id, station);
    if (!adjacencyList.has(station.id)) {
      adjacencyList.set(station.id, []);
    }
  }

  // 1. Group stations by line and sort in natural corridor order
  const lineStationMap = new Map<LineId, MetroStation[]>();

  for (const station of stations) {
    for (const lineId of station.lineIds) {
      if (!lineStationMap.has(lineId)) {
        lineStationMap.set(lineId, []);
      }
      lineStationMap.get(lineId)!.push(station);
    }
  }

  // 2. Add sequential track edges for each line corridor
  for (const [lineId, lineStations] of lineStationMap.entries()) {
    for (let i = 0; i < lineStations.length - 1; i++) {
      const u = lineStations[i];
      const v = lineStations[i + 1];

      // Note: Skip track edge if these are separate disconnected branches on development lines
      // In our verified dataset, stations are in sequential order along their respective line corridors.
      const dist = haversineDistanceKm(u.coordinates, v.coordinates);
      // Minutes = distance / speed * 60 + dwell time (approx 30s)
      const minutes = Math.max(1.5, Math.round(((dist / DEFAULT_AVG_SPEED_KMH) * 60 + 0.5) * 10) / 10);

      const confidence: DataConfidence =
        u.confidence === "verified" && v.confidence === "verified"
          ? "verified"
          : "development";

      // u -> v
      adjacencyList.get(u.id)?.push({
        toStationId: v.id,
        toLineId: lineId,
        distanceKm: dist,
        travelMinutes: minutes,
        isInterchange: false,
        confidence,
      });

      // v -> u
      adjacencyList.get(v.id)?.push({
        toStationId: u.id,
        toLineId: lineId,
        distanceKm: dist,
        travelMinutes: minutes,
        isInterchange: false,
        confidence,
      });
    }
  }

  // 3. Add explicit interchange transfer edges
  for (const station of stations) {
    if (station.isInterchange && station.interchangeConnections) {
      for (const conn of station.interchangeConnections) {
        const transferMins = conn.estimatedTransferMinutes ?? 4.0;
        adjacencyList.get(station.id)?.push({
          toStationId: conn.targetStationId,
          toLineId: conn.targetLineId,
          distanceKm: 0.1, // Approximate station concourse walkway
          travelMinutes: transferMins,
          isInterchange: true,
          confidence: conn.confidence,
        });
      }
    }
  }

  return { adjacencyList, stationsById };
}
