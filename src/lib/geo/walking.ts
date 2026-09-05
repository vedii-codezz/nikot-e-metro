import { Coordinates } from "../../types/geo";

/**
 * Average urban walking speed in kilometers per hour.
 * Standard transit planning assumption: 4.8 km/h (~80 meters/min).
 */
export const DEFAULT_WALKING_SPEED_KMH = 4.8;

/**
 * Estimates walking duration in minutes for a given distance in kilometers.
 *
 * @param distanceKm Distance in km
 * @param speedKmh Walking speed in km/h (default: 4.8)
 * @returns Estimated minutes, rounded to nearest whole minute (min: 1 min if > 0)
 */
export function estimateWalkMinutes(distanceKm: number, speedKmh: number = DEFAULT_WALKING_SPEED_KMH): number {
  if (distanceKm <= 0) return 0;
  const hours = distanceKm / speedKmh;
  const minutes = Math.round(hours * 60);
  return Math.max(1, minutes);
}

/**
 * Formats a distance value for user-facing display.
 * Example: "450 m" or "1.2 km"
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Pedestrian routing provider interface.
 * Can be implemented by future real walking navigation APIs (e.g. OSRM, Valhalla, GraphHopper).
 */
export interface PedestrianRouteProvider {
  calculateWalkRoute(origin: Coordinates, destination: Coordinates): Promise<{
    actualDistanceKm: number;
    actualDurationMinutes: number;
    geometry?: [number, number][]; // [longitude, latitude] pairs
    isVerified: boolean;
  }>;
}

/**
 * Default fallback pedestrian estimator using straight-line approximation.
 */
export class StraightLineWalkEstimator implements PedestrianRouteProvider {
  async calculateWalkRoute(origin: Coordinates, destination: Coordinates) {
    // Note: This is an unverified proximity estimate, not a turn-by-turn route
    const { haversineDistanceKm } = await import("./haversine");
    const distanceKm = haversineDistanceKm(origin, destination);
    return {
      actualDistanceKm: distanceKm,
      actualDurationMinutes: estimateWalkMinutes(distanceKm),
      isVerified: false,
    };
  }
}
