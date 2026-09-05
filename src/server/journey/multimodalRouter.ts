import { RouteRequest } from "../validation/routeValidation";
import {
  MultimodalJourneyCandidate,
  JourneyLeg,
  RoutingOptimizationPreference,
  DataQuality,
} from "../../types/multimodal";
import { JourneyRoute, RouteSegment, MetroRideSegment, InterchangeSegment, FirstMileWalkSegment, LastMileWalkSegment } from "../../types/routing";
import { getServerMetroGraph } from "../routing/graph";
import { findShortestPath, MetroPathResult } from "../../lib/routing/dijkstra";
import { candidateStationService, CandidateStationWithWalk } from "./candidateStationService";
import { journeyScorer } from "./journeyScorer";
import { rideHailingProviders } from "../ridehail/rideHailProvider";
import { haversineDistanceKm } from "../../lib/geo/haversine";

export interface MultimodalPlanResult {
  primaryRoute: JourneyRoute;
  primaryCandidate: MultimodalJourneyCandidate;
  alternatives: MultimodalJourneyCandidate[];
  rideHail: {
    uber?: string;
    ola?: string;
    rapido?: string;
  };
}

export class MultimodalRouter {
  async planMultimodalRoute(request: RouteRequest): Promise<MultimodalPlanResult | null> {
    const { graph, stations } = await getServerMetroGraph();
    const preference: RoutingOptimizationPreference = (request.mode as any) || "recommended";

    const originInput = {
      coordinates: request.origin.coordinates,
      stationId: request.origin.stationId,
    };

    const destInput = {
      coordinates: request.destination.coordinates,
      stationId: request.destination.stationId,
    };

    // 1. Resolve Candidate Stations for Origin and Destination (Up to 3 each)
    const [originCandidates, destCandidates] = await Promise.all([
      candidateStationService.getCandidateStations(originInput, 3),
      candidateStationService.getCandidateStations(destInput, 3),
    ]);

    if (originCandidates.length === 0 || destCandidates.length === 0) {
      return null;
    }

    // 2. Evaluate Candidate Station Pairs (3 origin x 3 dest = up to 9 candidates)
    const rawCandidates: MultimodalJourneyCandidate[] = [];

    for (let i = 0; i < originCandidates.length; i++) {
      const origCand = originCandidates[i];
      for (let j = 0; j < destCandidates.length; j++) {
        const destCand = destCandidates[j];

        // Find shortest path on operational graph
        const metroPath = findShortestPath(graph, origCand.station.id, destCand.station.id);
        if (!metroPath) continue;

        const candidate = this.assembleCandidate(
          `cand_${origCand.station.id}_${destCand.station.id}_${i}_${j}`,
          request.origin.name || origCand.station.name,
          request.destination.name || destCand.station.name,
          origCand,
          destCand,
          metroPath,
          preference
        );

        rawCandidates.push(candidate);
      }
    }

    if (rawCandidates.length === 0) {
      return null;
    }

    // 3. Deduplicate candidates by their key corridor signatures
    const uniqueCandidates = this.deduplicateCandidates(rawCandidates);

    // 4. Rank candidates by preference routingScore
    uniqueCandidates.sort((a, b) => a.routingScore - b.routingScore);

    const primaryCandidate = uniqueCandidates[0];
    const alternatives = uniqueCandidates.slice(1, 4);

    // 5. Build traditional JourneyRoute for backwards compatibility
    const primaryRoute = this.convertToJourneyRoute(
      primaryCandidate,
      request.origin.name || primaryCandidate.legs[0].origin.name,
      request.destination.name || primaryCandidate.legs[primaryCandidate.legs.length - 1].destination.name,
      request.origin.coordinates,
      request.destination.coordinates
    );

    // 6. Generate Ride-Hailing deep links if coordinates available
    let rideHail: { uber?: string; ola?: string; rapido?: string } = {};
    if (request.origin.coordinates && request.destination.coordinates) {
      rideHail = {
        uber: rideHailingProviders.uber.getDeepLink(
          request.origin.coordinates,
          request.destination.coordinates,
          request.destination.name
        ),
        ola: rideHailingProviders.ola.getDeepLink(
          request.origin.coordinates,
          request.destination.coordinates,
          request.destination.name
        ),
        rapido: rideHailingProviders.rapido.getDeepLink(),
      };
    }

    return {
      primaryRoute,
      primaryCandidate,
      alternatives,
      rideHail,
    };
  }

  private assembleCandidate(
    id: string,
    originName: string,
    destName: string,
    origCand: CandidateStationWithWalk,
    destCand: CandidateStationWithWalk,
    metroPath: MetroPathResult,
    preference: RoutingOptimizationPreference
  ): MultimodalJourneyCandidate {
    const legs: JourneyLeg[] = [];
    let totalWalkingMeters = 0;
    let totalActualSecs = 0;

    // 1. First-mile walk leg (if distance > 0)
    if (origCand.walkRoute.distanceMeters > 20) {
      legs.push({
        mode: "walk",
        origin: {
          name: originName,
          coordinates: origCand.walkRoute.geometry?.coordinates[0]
            ? {
                latitude: origCand.walkRoute.geometry.coordinates[0][1],
                longitude: origCand.walkRoute.geometry.coordinates[0][0],
              }
            : origCand.station.coordinates,
        },
        destination: {
          name: origCand.station.name,
          coordinates: origCand.station.coordinates,
          stationId: origCand.station.id,
        },
        distanceMeters: origCand.walkRoute.distanceMeters,
        durationSeconds: origCand.walkRoute.durationSeconds,
        geometry: origCand.walkRoute.geometry,
        dataQuality: origCand.walkRoute.quality,
        source: origCand.walkRoute.source,
        instruction: `Walk ${Math.round(origCand.walkRoute.distanceMeters)}m to ${origCand.station.name}`,
      });
      totalWalkingMeters += origCand.walkRoute.distanceMeters;
      totalActualSecs += origCand.walkRoute.durationSeconds;
    }

    // 2. Metro legs and interchanges
    for (const seg of metroPath.segments) {
      if (seg.type === "metro_ride") {
        const metroSeg = seg as MetroRideSegment;
        const durSecs = Math.round(metroSeg.travelMinutes * 60);
        let distMeters = 0;
        for (let s = 0; s < metroSeg.stations.length - 1; s++) {
          distMeters += Math.round(
            haversineDistanceKm(metroSeg.stations[s].coordinates, metroSeg.stations[s + 1].coordinates) * 1000
          );
        }
        if (distMeters === 0) distMeters = 1500;

        legs.push({
          mode: "metro",
          origin: {
            name: metroSeg.fromStation.name,
            coordinates: metroSeg.fromStation.coordinates,
            stationId: metroSeg.fromStation.id,
          },
          destination: {
            name: metroSeg.toStation.name,
            coordinates: metroSeg.toStation.coordinates,
            stationId: metroSeg.toStation.id,
          },
          distanceMeters: distMeters,
          durationSeconds: durSecs,
          routeId: metroSeg.lineId,
          routeName: `${metroSeg.lineId.toUpperCase()} Line`,
          lineColor: this.getLineColor(metroSeg.lineId),
          stopCount: metroSeg.stopCount,
          dataQuality: "verified",
          source: "kolkata_metro_timetable",
          instruction: `Board ${metroSeg.lineId.toUpperCase()} Line towards ${metroSeg.toStation.name} (${metroSeg.stopCount} stops)`,
        });
        totalActualSecs += durSecs;
      } else if (seg.type === "interchange") {
        const icSeg = seg as InterchangeSegment;
        const transferSecs = (icSeg.estimatedTransferMinutes ?? 4) * 60;
        legs.push({
          mode: "walk",
          origin: {
            name: `${icSeg.atStation.name} (${icSeg.fromLineId.toUpperCase()})`,
            coordinates: icSeg.atStation.coordinates,
            stationId: icSeg.atStation.id,
          },
          destination: {
            name: `${icSeg.atStation.name} (${icSeg.toLineId.toUpperCase()})`,
            coordinates: icSeg.atStation.coordinates,
            stationId: icSeg.atStation.id,
          },
          distanceMeters: 100,
          durationSeconds: transferSecs,
          dataQuality: "verified",
          source: "concourse_interchange",
          instruction: `Transfer to ${icSeg.toLineId.toUpperCase()} Line via concourse walkway`,
        });
        totalWalkingMeters += 100;
        totalActualSecs += transferSecs;
      }
    }

    // 3. Last-mile walk leg (if distance > 0)
    if (destCand.walkRoute.distanceMeters > 20) {
      legs.push({
        mode: "walk",
        origin: {
          name: destCand.station.name,
          coordinates: destCand.station.coordinates,
          stationId: destCand.station.id,
        },
        destination: {
          name: destName,
          coordinates: destCand.walkRoute.geometry?.coordinates[
            destCand.walkRoute.geometry.coordinates.length - 1
          ]
            ? {
                latitude:
                  destCand.walkRoute.geometry.coordinates[
                    destCand.walkRoute.geometry.coordinates.length - 1
                  ][1],
                longitude:
                  destCand.walkRoute.geometry.coordinates[
                    destCand.walkRoute.geometry.coordinates.length - 1
                  ][0],
              }
            : destCand.station.coordinates,
        },
        distanceMeters: destCand.walkRoute.distanceMeters,
        durationSeconds: destCand.walkRoute.durationSeconds,
        geometry: destCand.walkRoute.geometry,
        dataQuality: destCand.walkRoute.quality,
        source: destCand.walkRoute.source,
        instruction: `Walk ${Math.round(destCand.walkRoute.distanceMeters)}m to ${destName}`,
      });
      totalWalkingMeters += destCand.walkRoute.distanceMeters;
      totalActualSecs += destCand.walkRoute.durationSeconds;
    }

    const candidate: MultimodalJourneyCandidate = {
      id,
      legs,
      totalActualDurationSeconds: totalActualSecs,
      totalWalkingMeters,
      metroInterchangeCount: metroPath.interchangeCount,
      transportModeChangeCount: 0,
      routingScore: 0, // Will be computed by scorer
      quality: "verified",
    };

    candidate.routingScore = journeyScorer.scoreCandidate(candidate, preference);
    candidate.explanation = journeyScorer.generateExplanation(candidate, preference);

    return candidate;
  }

  private deduplicateCandidates(
    candidates: MultimodalJourneyCandidate[]
  ): MultimodalJourneyCandidate[] {
    const seen = new Map<string, MultimodalJourneyCandidate>();

    for (const cand of candidates) {
      // Signature based on origin station, destination station, and lines used
      const signature = cand.legs
        .map((l) => `${l.mode}:${l.routeId || ""}:${l.origin.stationId || l.origin.name}->${l.destination.stationId || l.destination.name}`)
        .join("|");

      if (!seen.has(signature)) {
        seen.set(signature, cand);
      } else {
        const existing = seen.get(signature)!;
        if (cand.routingScore < existing.routingScore) {
          seen.set(signature, cand);
        }
      }
    }

    return Array.from(seen.values());
  }

  private convertToJourneyRoute(
    candidate: MultimodalJourneyCandidate,
    originName: string,
    destinationName: string,
    originCoordinates?: { latitude: number; longitude: number },
    destinationCoordinates?: { latitude: number; longitude: number }
  ): JourneyRoute {
    const segments: RouteSegment[] = [];
    const linesUsedSet = new Set<any>();

    for (const leg of candidate.legs) {
      if (leg.mode === "walk") {
        if (leg === candidate.legs[0] && leg.destination.stationId) {
          segments.push({
            type: "first_mile_walk",
            originName: leg.origin.name,
            originCoordinates: leg.origin.coordinates,
            targetStation: {
              id: leg.destination.stationId,
              name: leg.destination.name,
              lineIds: [],
              coordinates: leg.destination.coordinates,
              isInterchange: false,
              confidence: "verified",
            },
            distanceKm: Math.round((leg.distanceMeters / 1000) * 100) / 100,
            estimatedWalkMinutes: Math.max(1, Math.round(leg.durationSeconds / 60)),
            walkingRouteQuality: leg.dataQuality,
            walkingGeometry: leg.geometry,
            walkingSource: leg.source as any,
          } as FirstMileWalkSegment);
        } else if (leg === candidate.legs[candidate.legs.length - 1] && leg.origin.stationId) {
          segments.push({
            type: "last_mile_walk",
            fromStation: {
              id: leg.origin.stationId,
              name: leg.origin.name,
              lineIds: [],
              coordinates: leg.origin.coordinates,
              isInterchange: false,
              confidence: "verified",
            },
            destinationName: leg.destination.name,
            destinationCoordinates: leg.destination.coordinates,
            distanceKm: Math.round((leg.distanceMeters / 1000) * 100) / 100,
            estimatedWalkMinutes: Math.max(1, Math.round(leg.durationSeconds / 60)),
            walkingRouteQuality: leg.dataQuality,
            walkingGeometry: leg.geometry,
            walkingSource: leg.source as any,
          } as LastMileWalkSegment);
        } else {
          // Concourse transfer
          segments.push({
            type: "interchange",
            atStation: {
              id: leg.origin.stationId || "",
              name: leg.origin.name,
              lineIds: [],
              coordinates: leg.origin.coordinates,
              isInterchange: true,
              confidence: "verified",
            },
            fromLineId: "blue",
            toLineId: "green",
            estimatedTransferMinutes: Math.max(1, Math.round(leg.durationSeconds / 60)),
            confidence: "verified",
          } as InterchangeSegment);
        }
      } else if (leg.mode === "metro") {
        if (leg.routeId) linesUsedSet.add(leg.routeId);
        segments.push({
          type: "metro_ride",
          lineId: (leg.routeId as any) || "blue",
          fromStation: {
            id: leg.origin.stationId || "",
            name: leg.origin.name,
            lineIds: [(leg.routeId as any) || "blue"],
            coordinates: leg.origin.coordinates,
            isInterchange: false,
            confidence: "verified",
          },
          toStation: {
            id: leg.destination.stationId || "",
            name: leg.destination.name,
            lineIds: [(leg.routeId as any) || "blue"],
            coordinates: leg.destination.coordinates,
            isInterchange: false,
            confidence: "verified",
          },
          stations: [
            {
              id: leg.origin.stationId || "",
              name: leg.origin.name,
              lineIds: [(leg.routeId as any) || "blue"],
              coordinates: leg.origin.coordinates,
              isInterchange: false,
              confidence: "verified",
            },
            {
              id: leg.destination.stationId || "",
              name: leg.destination.name,
              lineIds: [(leg.routeId as any) || "blue"],
              coordinates: leg.destination.coordinates,
              isInterchange: false,
              confidence: "verified",
            },
          ],
          stopCount: leg.stopCount || 1,
          travelMinutes: Math.max(1, Math.round(leg.durationSeconds / 60)),
          confidence: "verified",
        } as MetroRideSegment);
      }
    }

    let totalDistKm = 0;
    for (const leg of candidate.legs) {
      totalDistKm += leg.distanceMeters / 1000;
    }

    return {
      id: candidate.id,
      originName,
      destinationName,
      originCoordinates,
      destinationCoordinates,
      originStation: {
        id: candidate.legs.find((l) => l.mode === "metro")?.origin.stationId || "",
        name: candidate.legs.find((l) => l.mode === "metro")?.origin.name || "",
        lineIds: Array.from(linesUsedSet),
        coordinates: candidate.legs[0].origin.coordinates,
        isInterchange: false,
        confidence: "verified",
      },
      destinationStation: {
        id:
          [...candidate.legs].reverse().find((l) => l.mode === "metro")?.destination.stationId ||
          "",
        name:
          [...candidate.legs].reverse().find((l) => l.mode === "metro")?.destination.name ||
          "",
        lineIds: Array.from(linesUsedSet),
        coordinates: candidate.legs[candidate.legs.length - 1].destination.coordinates,
        isInterchange: false,
        confidence: "verified",
      },
      segments,
      totalTravelMinutes: Math.round(candidate.totalActualDurationSeconds / 60),
      totalDistanceKm: Math.round(totalDistKm * 10) / 10,
      totalStops: candidate.legs
        .filter((l) => l.mode === "metro")
        .reduce((sum, l) => sum + (l.stopCount || 1), 0),
      interchangeCount: candidate.metroInterchangeCount,
      linesUsed: Array.from(linesUsedSet),
      isDirect: candidate.metroInterchangeCount === 0,
      confidence: (candidate.quality === "unknown" ? "development" : "verified") as any,
    };
  }

  private getLineColor(lineId?: string): string {
    switch (lineId) {
      case "blue":
        return "#0072CE";
      case "green":
        return "#00A651";
      case "purple":
        return "#800080";
      case "orange":
        return "#FF8000";
      case "yellow":
        return "#FCCC0A";
      case "pink":
        return "#E91E63";
      default:
        return "#888888";
    }
  }
}

export const multimodalRouter = new MultimodalRouter();
