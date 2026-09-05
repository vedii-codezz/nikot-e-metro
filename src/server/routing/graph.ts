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

  // Authoritatively load stations from the database layer
  const stations = await stationRepository.getAllStations();
  cachedGraph = buildMetroGraph(stations);
  lastBuiltAt = now;

  return { graph: cachedGraph, stations };
}
