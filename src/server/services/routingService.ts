import { RouteRequest } from "../validation/routeValidation";
import { JourneyRoute, LastMileWalkSegment } from "../../types/routing";
import { getServerMetroGraph } from "../routing/graph";
import { planFullJourney } from "../../lib/routing/dijkstra";
import { pedestrianService } from "../pedestrian/pedestrianService";
import { haversineDistanceKm } from "../../lib/geo/haversine";
import { multimodalRouter, MultimodalPlanResult } from "../journey/multimodalRouter";

export class RoutingService {
  async planMultimodalRoute(request: RouteRequest): Promise<MultimodalPlanResult | null> {
    return multimodalRouter.planMultimodalRoute(request);
  }

  async planRoute(request: RouteRequest): Promise<JourneyRoute | null> {
    const multiPlan = await this.planMultimodalRoute(request);
    if (multiPlan) {
      return multiPlan.primaryRoute;
    }

    const { graph, stations } = await getServerMetroGraph();

    const origin = {
      name: request.origin.name || "Origin Location",
      coordinates: request.origin.coordinates,
      stationId: request.origin.stationId,
    };

    const destination = {
      name: request.destination.name || "Destination Location",
      coordinates: request.destination.coordinates,
      stationId: request.destination.stationId,
    };

    const journey = planFullJourney(graph, stations, origin, destination);
    if (!journey) return null;

    // 1. Enrich first-mile walk with real pedestrian route if origin coordinates provided
    if (origin.coordinates && journey.segments.length > 0 && journey.segments[0].type === "first_mile_walk") {
      const firstSeg = journey.segments[0];
      try {
        const walk = await pedestrianService.getWalkingRoute(origin.coordinates, firstSeg.targetStation.coordinates);
        firstSeg.distanceKm = Math.round((walk.distanceMeters / 1000) * 100) / 100;
        firstSeg.estimatedWalkMinutes = Math.max(1, Math.round(walk.durationSeconds / 60));
        firstSeg.walkingRouteQuality = walk.quality;
        firstSeg.walkingGeometry = walk.geometry;
        firstSeg.walkingSource = walk.source;
      } catch {
        firstSeg.walkingRouteQuality = "estimated";
      }
    }

    // 2. Enrich last-mile walk with real pedestrian route if destination coordinates provided
    const lastIdx = journey.segments.length - 1;
    if (destination.coordinates && journey.segments.length > 0 && journey.segments[lastIdx].type === "last_mile_walk") {
      const lastSeg = journey.segments[lastIdx] as LastMileWalkSegment;
      try {
        const walk = await pedestrianService.getWalkingRoute(lastSeg.fromStation.coordinates, destination.coordinates);
        lastSeg.distanceKm = Math.round((walk.distanceMeters / 1000) * 100) / 100;
        lastSeg.estimatedWalkMinutes = Math.max(1, Math.round(walk.durationSeconds / 60));
        lastSeg.walkingRouteQuality = walk.quality;
        lastSeg.walkingGeometry = walk.geometry;
        lastSeg.walkingSource = walk.source;
      } catch {
        lastSeg.walkingRouteQuality = "estimated";
      }
    }

    // 3. Recalculate journey totals with enriched walking metrics
    let totalMinutes = 0;
    let totalKm = 0;
    for (const seg of journey.segments) {
      if (seg.type === "first_mile_walk" || seg.type === "last_mile_walk") {
        totalMinutes += seg.estimatedWalkMinutes;
        totalKm += seg.distanceKm;
      } else if (seg.type === "metro_ride") {
        totalMinutes += seg.travelMinutes;
        let segDist = 0;
        for (let i = 0; i < seg.stations.length - 1; i++) {
          segDist += haversineDistanceKm(seg.stations[i].coordinates, seg.stations[i + 1].coordinates);
        }
        totalKm += segDist;
      } else if (seg.type === "interchange") {
        totalMinutes += seg.estimatedTransferMinutes ?? 4;
        totalKm += 0.1;
      }
    }
    journey.totalTravelMinutes = Math.round(totalMinutes);
    journey.totalDistanceKm = Math.round(totalKm * 10) / 10;

    return journey;
  }
}

export const routingService = new RoutingService();

