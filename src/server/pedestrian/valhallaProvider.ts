import { Coordinates } from "../../types/geo";
import { PedestrianRoute, PedestrianRouteProvider } from "./provider";

const DEFAULT_VALHALLA_URL = "https://valhalla1.openstreetmap.de";
const DEFAULT_TIMEOUT_MS = 3500;

export function decodePolyline6(str: string): [number, number][] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];
  const factor = 1e6;

  while (index < str.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

export class ValhallaPedestrianProvider implements PedestrianRouteProvider {
  name = "valhalla" as const;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = (baseUrl || process.env.PEDESTRIAN_ROUTING_BASE_URL || DEFAULT_VALHALLA_URL).replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  async getRoute(origin: Coordinates, destination: Coordinates): Promise<PedestrianRoute> {
    const url = `${this.baseUrl}/route`;
    const payload = {
      locations: [
        { lat: origin.latitude, lon: origin.longitude },
        { lat: destination.latitude, lon: destination.longitude },
      ],
      costing: "pedestrian",
      directions_options: {
        units: "kilometers",
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Nikot-e-Metro/1.0 (Public Transit Research)",
          "X-Client-Id": "nikot-e-metro",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Valhalla returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.trip || !data.trip.summary) {
        throw new Error("Invalid response format from Valhalla routing API");
      }

      const summary = data.trip.summary;
      const distanceMeters = Math.round((summary.length ?? 0) * 1000);
      const durationSeconds = Math.round(summary.time ?? 0);

      let coordinates: [number, number][] = [];
      const leg = data.trip.legs?.[0];
      if (leg && typeof leg.shape === "string") {
        coordinates = decodePolyline6(leg.shape);
      }

      return {
        distanceMeters,
        durationSeconds,
        geometry: coordinates.length > 0 ? { type: "LineString", coordinates } : undefined,
        source: "valhalla",
        quality: "routed",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
