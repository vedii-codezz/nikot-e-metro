export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export type LocationType = "landmark" | "station" | "transit_hub" | "hospital" | "educational" | "address" | "custom";

export interface GeocodingResult {
  id: string;
  name: string;
  bengaliName?: string;
  coordinates: Coordinates;
  type: LocationType;
  description?: string;
  source: "curated" | "nominatim" | "station" | "gps";
}
