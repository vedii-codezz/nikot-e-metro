import { Coordinates } from "../../types/geo";
import { PedestrianRoute, PedestrianRouteProvider } from "./provider";
import { ValhallaPedestrianProvider } from "./valhallaProvider";
import { OsrmFootPedestrianProvider } from "./osrmFootProvider";
import { haversineDistanceKm } from "../../lib/geo/haversine";
import { estimateWalkMinutes } from "../../lib/geo/walking";

interface CacheEntry {
  route: PedestrianRoute;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

export class PedestrianService {
  private primaryProvider: PedestrianRouteProvider;
  private secondaryProvider: PedestrianRouteProvider | null = null;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(
    primaryProvider?: PedestrianRouteProvider,
    secondaryProvider?: PedestrianRouteProvider | null
  ) {
    if (primaryProvider) {
      this.primaryProvider = primaryProvider;
      this.secondaryProvider = secondaryProvider ?? null;
      return;
    }

    const providerName = (process.env.PEDESTRIAN_ROUTING_PROVIDER || "valhalla").toLowerCase();
    const baseUrl = process.env.PEDESTRIAN_ROUTING_BASE_URL;

    if (providerName === "osrm-foot" || providerName === "osrm") {
      this.primaryProvider = new OsrmFootPedestrianProvider(baseUrl);
      this.secondaryProvider = new ValhallaPedestrianProvider();
    } else {
      // Default: Prefer Valhalla for pedestrian routing
      this.primaryProvider = new ValhallaPedestrianProvider(baseUrl);
      this.secondaryProvider = new OsrmFootPedestrianProvider();
    }
  }

  private makeCacheKey(origin: Coordinates, destination: Coordinates): string {
    const lat1 = origin.latitude.toFixed(5);
    const lng1 = origin.longitude.toFixed(5);
    const lat2 = destination.latitude.toFixed(5);
    const lng2 = destination.longitude.toFixed(5);
    return `${lat1},${lng1}->${lat2},${lng2}`;
  }

  async getWalkingRoute(origin: Coordinates, destination: Coordinates): Promise<PedestrianRoute> {
    const key = this.makeCacheKey(origin, destination);
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > now) {
      return cached.route;
    }

    // Try primary provider
    try {
      const route = await this.primaryProvider.getRoute(origin, destination);
      this.cache.set(key, { route, expiresAt: now + CACHE_TTL_MS });
      return route;
    } catch (primaryError) {
      console.warn(`[PedestrianService] Primary provider (${this.primaryProvider.name}) failed:`, primaryError instanceof Error ? primaryError.message : primaryError);

      // Try secondary provider if available
      if (this.secondaryProvider) {
        try {
          const route = await this.secondaryProvider.getRoute(origin, destination);
          this.cache.set(key, { route, expiresAt: now + CACHE_TTL_MS });
          return route;
        } catch (secondaryError) {
          console.warn(`[PedestrianService] Secondary provider (${this.secondaryProvider.name}) failed:`, secondaryError instanceof Error ? secondaryError.message : secondaryError);
        }
      }

      // Safe Haversine fallback
      const fallbackRoute = this.getHaversineFallback(origin, destination);
      this.cache.set(key, { route: fallbackRoute, expiresAt: now + CACHE_TTL_MS });
      return fallbackRoute;
    }
  }

  /**
   * Bounded batch routing for short-listed candidates.
   * Concurrently processes up to 2 candidates at a time to prevent rate-limit bursts.
   */
  async getBatchWalkingRoutes(
    origin: Coordinates,
    destinations: { id: string; coordinates: Coordinates }[]
  ): Promise<Map<string, PedestrianRoute>> {
    const results = new Map<string, PedestrianRoute>();
    const concurrencyLimit = 2;

    for (let i = 0; i < destinations.length; i += concurrencyLimit) {
      const chunk = destinations.slice(i, i + concurrencyLimit);
      const chunkPromises = chunk.map(async (item) => {
        const route = await this.getWalkingRoute(origin, item.coordinates);
        return { id: item.id, route };
      });

      const settled = await Promise.allSettled(chunkPromises);
      for (let j = 0; j < settled.length; j++) {
        const res = settled[j];
        if (res.status === "fulfilled") {
          results.set(res.value.id, res.value.route);
        } else {
          // If chunk promise itself failed, provide fallback
          const item = chunk[j];
          results.set(item.id, this.getHaversineFallback(origin, item.coordinates));
        }
      }
    }

    return results;
  }

  getHaversineFallback(origin: Coordinates, destination: Coordinates): PedestrianRoute {
    const distKm = haversineDistanceKm(origin, destination);
    const distanceMeters = Math.round(distKm * 1000);
    const durationSeconds = estimateWalkMinutes(distKm) * 60;

    return {
      distanceMeters,
      durationSeconds,
      geometry: undefined, // Never draw fake street curves for estimates
      source: "haversine",
      quality: "estimated",
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const pedestrianService = new PedestrianService();
