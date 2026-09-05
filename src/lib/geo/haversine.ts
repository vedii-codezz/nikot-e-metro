import { Coordinates } from "../../types/geo";
import { MetroStation, NearbyStationResult } from "../../types/station";
import { estimateWalkMinutes } from "./walking";

const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates the great-circle distance between two points on the Earth
 * using the Haversine formula.
 *
 * @param coord1 Origin coordinates
 * @param coord2 Destination coordinates
 * @returns Distance in kilometers, rounded to 3 decimal places
 */
export function haversineDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLng = toRadians(coord2.longitude - coord1.longitude);

  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 1000) / 1000;
}

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Ranks metro stations by proximity to a given coordinate.
 * Returns stations with Haversine distance and approximate walking estimate.
 *
 * @param target Origin coordinates
 * @param stations List of candidate metro stations
 * @param limit Maximum number of stations to return (default: 5)
 */
export function rankNearbyStations(
  target: Coordinates,
  stations: MetroStation[],
  limit: number = 5
): NearbyStationResult[] {
  const scored = stations.map((station) => {
    const distanceKm = haversineDistanceKm(target, station.coordinates);
    const estimatedWalkMinutes = estimateWalkMinutes(distanceKm);

    return {
      station,
      distanceKm,
      estimatedWalkMinutes,
      confidence: station.confidence,
    };
  });

  // Sort ascending by straight-line distance
  scored.sort((a, b) => a.distanceKm - b.distanceKm);

  return scored.slice(0, limit);
}
