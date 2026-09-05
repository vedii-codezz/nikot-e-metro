import { Coordinates } from "../../types/geo";

export type WalkingRouteQuality = "routed" | "estimated";
export type PedestrianSource = "valhalla" | "osrm-foot" | "haversine";

export interface PedestrianRoute {
  distanceMeters: number;
  durationSeconds: number;
  geometry?: {
    type: "LineString";
    coordinates: [number, number][]; // [longitude, latitude]
  };
  source: PedestrianSource;
  quality: WalkingRouteQuality;
}

export interface PedestrianRouteProvider {
  name: PedestrianSource;
  getRoute(origin: Coordinates, destination: Coordinates): Promise<PedestrianRoute>;
}
