import { MetroStation, LineId, DataConfidence, RoutingStatus } from "./station";
import { Coordinates } from "./geo";

export type RoutePreference = "fastest";

export interface GraphNode {
  stationId: string;
  lineId: LineId;
}

export interface GraphEdge {
  toStationId: string;
  toLineId: LineId;
  distanceKm: number;
  travelMinutes: number;
  isInterchange: boolean;
  confidence: DataConfidence;
  routingStatus: RoutingStatus;
}

export type RouteSegmentType = "first_mile_walk" | "metro_ride" | "interchange" | "last_mile_walk";

export interface FirstMileWalkSegment {
  type: "first_mile_walk";
  originName: string;
  originCoordinates: Coordinates;
  targetStation: MetroStation;
  distanceKm: number;
  estimatedWalkMinutes: number;
  walkingRouteQuality?: "routed" | "estimated";
  walkingGeometry?: {
    type: "LineString";
    coordinates: [number, number][];
  };
  walkingSource?: "valhalla" | "osrm-foot" | "haversine";
}

export interface MetroRideSegment {
  type: "metro_ride";
  lineId: LineId;
  fromStation: MetroStation;
  toStation: MetroStation;
  stations: MetroStation[]; // All intermediate stations inclusive
  stopCount: number;
  travelMinutes: number;
  confidence: DataConfidence;
}

export interface InterchangeSegment {
  type: "interchange";
  atStation: MetroStation;
  fromLineId: LineId;
  toLineId: LineId;
  estimatedTransferMinutes?: number;
  confidence: DataConfidence;
}

export interface LastMileWalkSegment {
  type: "last_mile_walk";
  fromStation: MetroStation;
  destinationName: string;
  destinationCoordinates: Coordinates;
  distanceKm: number;
  estimatedWalkMinutes: number;
  walkingRouteQuality?: "routed" | "estimated";
  walkingGeometry?: {
    type: "LineString";
    coordinates: [number, number][];
  };
  walkingSource?: "valhalla" | "osrm-foot" | "haversine";
}

export type RouteSegment =
  | FirstMileWalkSegment
  | MetroRideSegment
  | InterchangeSegment
  | LastMileWalkSegment;

export interface JourneyRoute {
  id: string;
  originName: string;
  destinationName: string;
  originCoordinates?: Coordinates;
  destinationCoordinates?: Coordinates;
  originStation: MetroStation;
  destinationStation: MetroStation;
  segments: RouteSegment[];
  totalTravelMinutes: number;
  totalDistanceKm: number;
  totalStops: number;
  interchangeCount: number;
  linesUsed: LineId[];
  isDirect: boolean;
  confidence: DataConfidence;
}
