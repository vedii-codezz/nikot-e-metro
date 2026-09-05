import { MetroStation } from "../../types/station";
import { buildMetroGraph, MetroGraph } from "../../lib/routing/graph";
import { stationRepository } from "../repositories/stationRepository";

let cachedGraph: MetroGraph | null = null;
let lastBuiltAt = 0;
const GRAPH_CACHE_TTL_MS = 60000; // 1 minute in-memory cache

export function invalidateServerGraph(): void {
  cachedGraph = null;
  lastBuiltAt = 0;
  console.log("[Nikot-e-Metro] Server metro graph cache invalidated.");
}

export async function getServerMetroGraph(): Promise<{ graph: MetroGraph; stations: MetroStation[] }> {
  const now = Date.now();
  if (cachedGraph && now - lastBuiltAt < GRAPH_CACHE_TTL_MS) {
    const stations = Array.from(cachedGraph.stationsById.values());
    return { graph: cachedGraph, stations };
  }

  // Authoritatively load stations and connections from PostgreSQL
  const [stations, connections] = await Promise.all([
    stationRepository.getAllStations(),
    stationRepository.getAllConnections(),
  ]);

  // Build graph restricted to operational edges for public passenger journeys
  cachedGraph = buildMetroGraph(stations, connections, { includeNonOperational: false });
  lastBuiltAt = now;

  return { graph: cachedGraph, stations };
}

export async function getDisplayMetroGraph(): Promise<{ graph: MetroGraph; stations: MetroStation[] }> {
  const [stations, connections] = await Promise.all([
    stationRepository.getAllStations(),
    stationRepository.getAllConnections(),
  ]);

  const graph = buildMetroGraph(stations, connections, { includeNonOperational: true });
  return { graph, stations };
}
