import { Coordinates } from "./geo";

export type TransportMode =
  | "walk"
  | "metro"
  | "bus"
  | "auto"
  | "toto"
  | "ride_hail"
  | "ferry"
  | "tram"
  | "suburban_rail";

export type DataQuality = "verified" | "routed" | "estimated" | "unknown";

export interface LocationPoint {
  name: string;
  coordinates: Coordinates;
  stationId?: string;
  stopId?: string;
}

export interface JourneyLeg {
  mode: TransportMode;
  origin: LocationPoint;
  destination: LocationPoint;
  distanceMeters: number;
  durationSeconds: number; // Actual physical or estimated travel time
  geometry?: {
    type: "LineString";
    coordinates: [number, number][];
  };
  routeName?: string;
  routeId?: string;
  lineColor?: string;
  textColor?: string;
  stopCount?: number;
  dataQuality: DataQuality;
  source?: string;
  instruction?: string;
}

export interface MultimodalJourneyCandidate {
  id: string;
  legs: JourneyLeg[];
  totalActualDurationSeconds: number; // Sum of real leg durations (displayed to user)
  totalWalkingMeters: number;
  metroInterchangeCount: number;
  transportModeChangeCount: number;
  routingScore: number; // Internal optimization score (duration + penalties)
  quality: DataQuality;
  explanation?: {
    tag: string;
    description: string;
  };
}

export type RoutingOptimizationPreference =
  | "recommended"
  | "fastest"
  | "least_walking"
  | "fewest_interchanges"
  | "public_transport_only";
