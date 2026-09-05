import { Coordinates } from "../../types/geo";
import { MetroStation } from "../../types/station";
import { stationRepository } from "../repositories/stationRepository";
import { pedestrianService } from "../pedestrian/pedestrianService";
import { PedestrianRoute } from "../pedestrian/provider";

export interface CandidateStationWithWalk {
  station: MetroStation;
  walkRoute: PedestrianRoute;
  distanceKm: number;
  durationMinutes: number;
}

export class CandidateStationService {
  /**
   * Generates ranked candidate stations for an origin or destination coordinate.
   * Steps:
   * 1. If stationId is provided, returns that station exclusively.
   * 2. Otherwise runs fast Haversine shortlist (top 4-5 stations).
   * 3. Executes bounded batch pedestrian routing via PedestrianService (Valhalla preferred).
   * 4. Reranks by actual walking accessibility and returns top K (default: 3) candidates.
   */
  async getCandidateStations(
    input: { coordinates?: Coordinates; stationId?: string },
    maxCandidates: number = 3
  ): Promise<CandidateStationWithWalk[]> {
    const allStations = await stationRepository.getAllStations();

    // If explicit stationId was selected by user
    if (input.stationId) {
      const station = allStations.find((s) => s.id === input.stationId);
      if (station && station.status === "operational") {
        return [
          {
            station,
            walkRoute: {
              distanceMeters: 0,
              durationSeconds: 0,
              source: "haversine",
              quality: "routed",
            },
            distanceKm: 0,
            durationMinutes: 0,
          },
        ];
      }
    }

    if (!input.coordinates) {
      return [];
    }

    const originCoords = input.coordinates;

    // 1. Haversine shortlist of OPERATIONAL stations only
    const operationalStations = allStations.filter((s) => s.status === "operational");
    const shortlist = await stationRepository.findNearby(originCoords, 5);
    const operationalShortlist = shortlist.filter((s) => s.station.status === "operational");

    if (operationalShortlist.length === 0) {
      return [];
    }

    // 2. Fetch real pedestrian routes with bounded concurrency & in-memory caching
    const routesMap = await pedestrianService.getBatchWalkingRoutes(
      originCoords,
      operationalShortlist.map((c) => ({ id: c.station.id, coordinates: c.station.coordinates }))
    );

    // 3. Assemble and rank candidates
    const candidates: CandidateStationWithWalk[] = operationalShortlist.map((c) => {
      const walk = routesMap.get(c.station.id) || pedestrianService.getHaversineFallback(originCoords, c.station.coordinates);
      const walkMins = Math.max(1, Math.round(walk.durationSeconds / 60));
      const distKm = Math.round((walk.distanceMeters / 1000) * 100) / 100;

      return {
        station: c.station,
        walkRoute: walk,
        distanceKm: distKm,
        durationMinutes: walkMins,
      };
    });

    // 4. Sort by walking duration, then distance
    candidates.sort((a, b) => {
      if (a.walkRoute.durationSeconds !== b.walkRoute.durationSeconds) {
        return a.walkRoute.durationSeconds - b.walkRoute.durationSeconds;
      }
      return a.walkRoute.distanceMeters - b.walkRoute.distanceMeters;
    });

    return candidates.slice(0, maxCandidates);
  }
}

export const candidateStationService = new CandidateStationService();
