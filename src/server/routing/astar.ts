import { MetroGraph } from "../../lib/routing/graph";
import { MetroPathResult, DijkstraNodeStep } from "../../lib/routing/dijkstra";
import { haversineDistanceKm } from "../../lib/geo/haversine";
import { RouteSegment, MetroRideSegment, InterchangeSegment } from "../../types/routing";
import { LineId, MetroStation } from "../../types/station";

const MAX_SPEED_KMH = 80.0; // Kolkata Metro design top speed (guarantees admissible h(n))

export interface AStarBenchmarkStats {
  algorithm: "dijkstra" | "astar";
  nodesExpanded: number;
  executionTimeMs: number;
  optimalCostMinutes: number;
}

/**
 * Calculates shortest path between two metro stations using A* search with Haversine heuristic.
 * Heuristic h(n) = distance(n, goal) / MAX_SPEED_KMH * 60 (in minutes).
 * Since true speed is <= MAX_SPEED_KMH, h(n) is admissible and consistent, ensuring optimal cost == Dijkstra.
 */
export function findShortestPathAStar(
  graph: MetroGraph,
  startStationId: string,
  endStationId: string
): { result: MetroPathResult | null; nodesExpanded: number } {
  const destStation = graph.stationsById.get(endStationId);
  if (!destStation) {
    return { result: null, nodesExpanded: 0 };
  }

  if (startStationId === endStationId) {
    const station = graph.stationsById.get(startStationId);
    if (!station) return { result: null, nodesExpanded: 0 };
    return {
      result: {
        stationIds: [startStationId],
        segments: [],
        totalTravelMinutes: 0,
        totalDistanceKm: 0,
        totalStops: 0,
        interchangeCount: 0,
        linesUsed: station.lineIds,
        confidence: station.confidence,
      },
      nodesExpanded: 0,
    };
  }

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const previous = new Map<string, DijkstraNodeStep>();
  const openSet = new Set<string>();
  const closedSet = new Set<string>();

  let nodesExpanded = 0;

  for (const stationId of graph.stationsById.keys()) {
    gScore.set(stationId, Infinity);
    fScore.set(stationId, Infinity);
  }

  gScore.set(startStationId, 0);

  const startStation = graph.stationsById.get(startStationId);
  const initialH = startStation
    ? (haversineDistanceKm(startStation.coordinates, destStation.coordinates) / MAX_SPEED_KMH) * 60
    : 0;
  fScore.set(startStationId, initialH);
  openSet.add(startStationId);

  while (openSet.size > 0) {
    // Pick node in openSet with lowest fScore
    let currentId: string | null = null;
    let minF = Infinity;

    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < minF) {
        minF = f;
        currentId = id;
      }
    }

    if (!currentId || minF === Infinity) break;

    if (currentId === endStationId) {
      // Reconstruct path
      const result = reconstructPath(graph, startStationId, endStationId, previous, gScore.get(endStationId) ?? 0);
      return { result, nodesExpanded };
    }

    openSet.delete(currentId);
    closedSet.add(currentId);
    nodesExpanded++;

    const edges = graph.adjacencyList.get(currentId) || [];
    const currentG = gScore.get(currentId) ?? 0;

    for (const edge of edges) {
      if (closedSet.has(edge.toStationId)) continue;

      const tentativeG = currentG + edge.travelMinutes;
      const targetG = gScore.get(edge.toStationId) ?? Infinity;

      if (tentativeG < targetG) {
        previous.set(edge.toStationId, {
          stationId: edge.toStationId,
          lineId: edge.toLineId,
          cost: tentativeG,
          distanceKm: edge.distanceKm,
          isInterchange: edge.isInterchange,
          previousStep: previous.get(currentId) || null,
        });

        gScore.set(edge.toStationId, tentativeG);

        const targetStation = graph.stationsById.get(edge.toStationId);
        const h = targetStation
          ? (haversineDistanceKm(targetStation.coordinates, destStation.coordinates) / MAX_SPEED_KMH) * 60
          : 0;
        fScore.set(edge.toStationId, tentativeG + h);

        openSet.add(edge.toStationId);
      }
    }
  }

  return { result: null, nodesExpanded };
}

function reconstructPath(
  graph: MetroGraph,
  startStationId: string,
  endStationId: string,
  previous: Map<string, DijkstraNodeStep>,
  totalMinutes: number
): MetroPathResult | null {
  const steps: { stationId: string; lineId: LineId; distanceKm: number; isInterchange: boolean }[] = [];
  let curr: string | undefined = endStationId;

  while (curr && curr !== startStationId) {
    const step = previous.get(curr);
    if (!step) break;
    steps.unshift({
      stationId: step.stationId,
      lineId: step.lineId,
      distanceKm: step.distanceKm,
      isInterchange: step.isInterchange,
    });
    curr = step.previousStep ? step.previousStep.stationId : startStationId;
  }

  const stationIds: string[] = [startStationId, ...steps.map((s) => s.stationId)];
  const segments: RouteSegment[] = [];
  const linesUsedSet = new Set<LineId>();

  let currentLine: LineId | null = null;
  let currentSegmentStations: MetroStation[] = [];
  let currentSegmentDistance = 0;
  let currentSegmentMinutes = 0;
  let interchangeCount = 0;

  const pushMetroSegment = () => {
    if (currentSegmentStations.length > 1 && currentLine) {
      linesUsedSet.add(currentLine);
      segments.push({
        type: "metro_ride",
        lineId: currentLine,
        fromStation: currentSegmentStations[0],
        toStation: currentSegmentStations[currentSegmentStations.length - 1],
        stations: [...currentSegmentStations],
        stopCount: currentSegmentStations.length - 1,
        travelMinutes: Math.round(currentSegmentMinutes * 10) / 10,
        confidence: "verified",
      } as MetroRideSegment);
    }
    currentSegmentStations = [];
    currentSegmentDistance = 0;
    currentSegmentMinutes = 0;
  };

  const startSt = graph.stationsById.get(startStationId);
  if (startSt) currentSegmentStations.push(startSt);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const st = graph.stationsById.get(step.stationId);
    if (!st) continue;

    if (step.isInterchange) {
      pushMetroSegment();
      interchangeCount++;
      const prevStation = graph.stationsById.get(steps[i - 1]?.stationId || startStationId)!;
      segments.push({
        type: "interchange",
        atStation: prevStation,
        fromLineId: currentLine || prevStation.lineIds[0],
        toLineId: step.lineId,
        estimatedTransferMinutes: 4,
        confidence: "verified",
      } as InterchangeSegment);
      currentLine = step.lineId;
      currentSegmentStations = [st];
    } else {
      if (currentLine === null) {
        currentLine = step.lineId;
      } else if (currentLine !== step.lineId) {
        pushMetroSegment();
        interchangeCount++;
        const prevStation = steps[i - 1] ? graph.stationsById.get(steps[i - 1].stationId) || st : st;
        segments.push({
          type: "interchange",
          atStation: prevStation,
          fromLineId: currentLine,
          toLineId: step.lineId,
          estimatedTransferMinutes: 3,
          confidence: "verified",
        } as InterchangeSegment);
        currentLine = step.lineId;
        currentSegmentStations = [prevStation];
      }
      currentSegmentStations.push(st);
      currentSegmentDistance += step.distanceKm;
      currentSegmentMinutes += 2.0;
    }
  }

  pushMetroSegment();

  let totalDistKm = 0;
  for (const s of steps) totalDistKm += s.distanceKm;

  return {
    stationIds,
    segments,
    totalTravelMinutes: Math.round(totalMinutes),
    totalDistanceKm: Math.round(totalDistKm * 10) / 10,
    totalStops: stationIds.length - 1,
    interchangeCount,
    linesUsed: Array.from(linesUsedSet),
    confidence: "verified",
  };
}
