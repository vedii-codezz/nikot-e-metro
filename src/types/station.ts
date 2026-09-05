import { Coordinates } from "./geo";

export type DataConfidence = "verified" | "development" | "planned";

export type LineId = "blue" | "green" | "purple" | "orange" | "yellow";

export interface MetroLine {
  id: LineId;
  name: string;
  lineCode: string; // e.g. "Line 1", "Line 2"
  bengaliName: string;
  color: string; // Hex color
  textColor: string;
  terminus: [string, string];
  status: "operational" | "partially_operational" | "under_construction";
  confidence: DataConfidence;
}

export interface InterchangeConnection {
  targetStationId: string;
  targetLineId: LineId;
  estimatedTransferMinutes?: number;
  confidence: DataConfidence;
}

export interface MetroStation {
  id: string;
  name: string;
  bengaliName?: string;
  code?: string;
  coordinates: Coordinates;
  lineIds: LineId[];
  isInterchange: boolean;
  interchangeConnections?: InterchangeConnection[];
  confidence: DataConfidence;
  accessibility?: {
    elevator?: boolean;
    wheelchair?: boolean;
    confidence: DataConfidence;
  };
  nearbyLandmarks?: string[];
  openedYear?: number;
}

export interface NearbyStationResult {
  station: MetroStation;
  distanceKm: number;          // Haversine straight-line distance
  estimatedWalkMinutes: number; // Approximate walking time at standard pedestrian pace
  confidence: DataConfidence;
}
