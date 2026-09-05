import { Coordinates } from "../../types/geo";
import { PedestrianRoute, PedestrianRouteProvider } from "./provider";

const DEFAULT_OSRM_FOOT_URL = "https://routing.openstreetmap.de/routed-foot";
const DEFAULT_TIMEOUT_MS = 3500;
const MIN_REQUEST_INTERVAL_MS = 1000; // Fair-use: maximum ~1 request/second for public OSRM

let lastRequestTime = 0;

export class OsrmFootPedestrianProvider implements PedestrianRouteProvider {
  name = "osrm-foot" as const;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = (baseUrl || process.env.PEDESTRIAN_ROUTING_BASE_URL || DEFAULT_OSRM_FOOT_URL).replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async getRoute(origin: Coordinates, destination: Coordinates): Promise<PedestrianRoute> {
    // Respect fair-use rate limiting: enforce 1 request / second interval
    const now = Date.now();
    const waitTime = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestTime));
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastRequestTime = Date.now();

    const coordsStr = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url = `${this.baseUrl}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Nikot-e-Metro/1.0 (Public Transit Research)",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OSRM Foot returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
        throw new Error(`OSRM Foot routing failed: ${data.code || "No route found"}`);
      }

      const route = data.routes[0];
      const distanceMeters = Math.round(route.distance ?? 0);
      const durationSeconds = Math.round(route.duration ?? 0);
      const coordinates = route.geometry?.coordinates as [number, number][] | undefined;

      return {
        distanceMeters,
        durationSeconds,
        geometry: coordinates && coordinates.length > 0 ? { type: "LineString", coordinates } : undefined,
        source: "osrm-foot",
        quality: "routed",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
