import { MetroStation, LineId, DataConfidence } from "../../types/station";
import {
  JourneyRoute,
  RouteSegment,
  MetroRideSegment,
  InterchangeSegment,
  FirstMileWalkSegment,
  LastMileWalkSegment,
} from "../../types/routing";
import { Coordinates } from "../../types/geo";
import { MetroGraph } from "./graph";
import { haversineDistanceKm, rankNearbyStations } from "../geo/haversine";
import { estimateWalkMinutes } from "../geo/walking";

export interface DijkstraNodeStep {
  stationId: string;
  lineId: LineId;
  cost: number; // in travel minutes
  distanceKm: number;
  isInterchange: boolean;
  previousStep: DijkstraNodeStep | null;
}

export interface MetroPathResult {
  stationIds: string[];
  segments: RouteSegment[];
  totalTravelMinutes: number;
  totalDistanceKm: number;
  totalStops: number;
  interchangeCount: number;
  linesUsed: LineId[];
  confidence: DataConfidence;
}

/**
 * Calculates the shortest path between two metro stations using Dijkstra's Algorithm.
 */
export function findShortestPath(
  graph: MetroGraph,
  startStationId: string,
  endStationId: string
): MetroPathResult | null {
  if (startStationId === endStationId) {
    const station = graph.stationsById.get(startStationId);
    if (!station) return null;

    return {
      stationIds: [startStationId],
      segments: [],
      totalTravelMinutes: 0,
      totalDistanceKm: 0,
      totalStops: 0,
      interchangeCount: 0,
      linesUsed: station.lineIds,
      confidence: station.confidence,
    };
  }

  // Priority queue / min-cost tracking
  const distances = new Map<string, number>();
  const previous = new Map<string, DijkstraNodeStep>();
  const visited = new Set<string>();

  // Queue of stationIds to evaluate
  const unvisited = new Set<string>();

  for (const stationId of graph.stationsById.keys()) {
    distances.set(stationId, Infinity);
    unvisited.add(stationId);
  }

  distances.set(startStationId, 0);

  while (unvisited.size > 0) {
    // Find unvisited station with lowest distance
    let currentStationId: string | null = null;
    let minDistance = Infinity;

    for (const stationId of unvisited) {
      const dist = distances.get(stationId) ?? Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        currentStationId = stationId;
      }
    }

    if (!currentStationId || minDistance === Infinity) {
      break; // All remaining vertices are inaccessible
    }

    if (currentStationId === endStationId) {
      break; // Found destination
    }

    unvisited.delete(currentStationId);
    visited.add(currentStationId);

    const edges = graph.adjacencyList.get(currentStationId) || [];
    for (const edge of edges) {
      if (visited.has(edge.toStationId)) continue;

      const alt = minDistance + edge.travelMinutes;
      const currentKnownDist = distances.get(edge.toStationId) ?? Infinity;

      if (alt < currentKnownDist) {
        distances.set(edge.toStationId, alt);
        previous.set(edge.toStationId, {
          stationId: edge.toStationId,
          lineId: edge.toLineId,
          cost: edge.travelMinutes,
          distanceKm: edge.distanceKm,
          isInterchange: edge.isInterchange,
          previousStep: previous.get(currentStationId) ?? {
            stationId: currentStationId,
            lineId: edge.toLineId,
            cost: 0,
            distanceKm: 0,
            isInterchange: false,
            previousStep: null,
          },
        });
      }
    }
  }

  // Reconstruct path
  if (!previous.has(endStationId) && startStationId !== endStationId) {
    return null; // No path found
  }

  const pathSteps: DijkstraNodeStep[] = [];
  let curr: DijkstraNodeStep | undefined = previous.get(endStationId);

  while (curr) {
    pathSteps.unshift(curr);
    curr = curr.previousStep ?? undefined;
    if (curr && curr.stationId === startStationId) {
      break;
    }
  }

  const stationIds: string[] = [startStationId];
  for (const step of pathSteps) {
    stationIds.push(step.stationId);
  }

  // Assemble segments
  const segments: RouteSegment[] = [];
  const linesUsedSet = new Set<LineId>();
  let currentRideStations: MetroStation[] = [];
  let currentRideLine: LineId | null = null;
  let currentRideMinutes = 0;
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let interchangeCount = 0;
  let allVerified = true;

  const startStation = graph.stationsById.get(startStationId)!;
  if (startStation.confidence !== "verified") allVerified = false;
  currentRideStations.push(startStation);

  for (let i = 0; i < pathSteps.length; i++) {
    const step = pathSteps[i];
    const station = graph.stationsById.get(step.stationId);
    if (!station) continue;

    if (station.confidence !== "verified") allVerified = false;

    if (step.isInterchange) {
      interchangeCount++;
      // Flush ongoing ride segment before the interchange
      if (currentRideStations.length >= 2 && currentRideLine) {
        segments.push({
          type: "metro_ride",
          lineId: currentRideLine,
          fromStation: currentRideStations[0],
          toStation: currentRideStations[currentRideStations.length - 1],
          stations: [...currentRideStations],
          stopCount: currentRideStations.length - 1,
          travelMinutes: Math.round(currentRideMinutes * 10) / 10,
          confidence: allVerified ? "verified" : "development",
        });
      }

      // Add interchange transfer segment
      const fromLine = currentRideLine ?? startStation.lineIds[0];
      const toLine = step.lineId;
      linesUsedSet.add(toLine);

      segments.push({
        type: "interchange",
        atStation: station,
        fromLineId: fromLine,
        toLineId: toLine,
        estimatedTransferMinutes: Math.round(step.cost),
        confidence: station.confidence,
      });

      // Reset ride segment accumulator
      currentRideStations = [station];
      currentRideLine = toLine;
      currentRideMinutes = 0;
    } else {
      if (!currentRideLine || currentRideLine !== step.lineId) {
        currentRideLine = step.lineId;
        linesUsedSet.add(currentRideLine);
      }
      currentRideStations.push(station);
      currentRideMinutes += step.cost;
      totalDistanceKm += step.distanceKm;
      totalTravelMinutes += step.cost;
    }
  }

  // Flush final ride segment
  if (currentRideStations.length >= 2 && currentRideLine) {
    segments.push({
      type: "metro_ride",
      lineId: currentRideLine,
      fromStation: currentRideStations[0],
      toStation: currentRideStations[currentRideStations.length - 1],
      stations: [...currentRideStations],
      stopCount: currentRideStations.length - 1,
      travelMinutes: Math.round(currentRideMinutes * 10) / 10,
      confidence: allVerified ? "verified" : "development",
    });
  }

  return {
    stationIds,
    segments,
    totalTravelMinutes: Math.round(totalTravelMinutes),
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalStops: Math.max(0, stationIds.length - 1 - interchangeCount),
    interchangeCount,
    linesUsed: Array.from(linesUsedSet),
    confidence: allVerified ? "verified" : "development",
  };
}

/**
 * Plans a complete end-to-end journey from origin coordinates/place to destination coordinates/place.
 */
export function planFullJourney(
  graph: MetroGraph,
  stations: MetroStation[],
  origin: { name: string; coordinates?: Coordinates; stationId?: string },
  destination: { name: string; coordinates?: Coordinates; stationId?: string }
): JourneyRoute | null {
  // 1. Resolve Origin Station
  let originStation: MetroStation | undefined;
  let firstMileWalk: FirstMileWalkSegment | undefined;

  if (origin.stationId) {
    originStation = graph.stationsById.get(origin.stationId);
  } else if (origin.coordinates) {
    const nearby = rankNearbyStations(origin.coordinates, stations, 1);
    if (nearby.length > 0) {
      originStation = nearby[0].station;
      firstMileWalk = {
        type: "first_mile_walk",
        originName: origin.name,
        originCoordinates: origin.coordinates,
        targetStation: originStation,
        distanceKm: nearby[0].distanceKm,
        estimatedWalkMinutes: nearby[0].estimatedWalkMinutes,
      };
    }
  }

  // 2. Resolve Destination Station
  let destinationStation: MetroStation | undefined;
  let lastMileWalk: LastMileWalkSegment | undefined;

  if (destination.stationId) {
    destinationStation = graph.stationsById.get(destination.stationId);
  } else if (destination.coordinates) {
    const nearby = rankNearbyStations(destination.coordinates, stations, 1);
    if (nearby.length > 0) {
      destinationStation = nearby[0].station;
      lastMileWalk = {
        type: "last_mile_walk",
        fromStation: destinationStation,
        destinationName: destination.name,
        destinationCoordinates: destination.coordinates,
        distanceKm: nearby[0].distanceKm,
        estimatedWalkMinutes: nearby[0].estimatedWalkMinutes,
      };
    }
  }

  if (!originStation || !destinationStation) {
    return null;
  }

  // 3. Compute Metro Shortest Path
  const metroPath = findShortestPath(graph, originStation.id, destinationStation.id);
  if (!metroPath) {
    return null;
  }

  // 4. Combine First-mile + Metro + Last-mile segments
  const allSegments: RouteSegment[] = [];
  let totalTime = metroPath.totalTravelMinutes;
  let totalDist = metroPath.totalDistanceKm;

  if (firstMileWalk) {
    allSegments.push(firstMileWalk);
    totalTime += firstMileWalk.estimatedWalkMinutes;
    totalDist += firstMileWalk.distanceKm;
  }

  allSegments.push(...metroPath.segments);

  if (lastMileWalk) {
    allSegments.push(lastMileWalk);
    totalTime += lastMileWalk.estimatedWalkMinutes;
    totalDist += lastMileWalk.distanceKm;
  }

  return {
    id: `route_${originStation.id}_${destinationStation.id}_${Date.now()}`,
    originName: origin.name,
    destinationName: destination.name,
    originCoordinates: origin.coordinates,
    destinationCoordinates: destination.coordinates,
    originStation,
    destinationStation,
    segments: allSegments,
    totalTravelMinutes: Math.round(totalTime),
    totalDistanceKm: Math.round(totalDist * 10) / 10,
    totalStops: metroPath.totalStops,
    interchangeCount: metroPath.interchangeCount,
    linesUsed: metroPath.linesUsed,
    isDirect: metroPath.interchangeCount === 0,
    confidence: metroPath.confidence,
  };
}
