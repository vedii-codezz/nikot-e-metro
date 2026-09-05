import { GeocodingResult } from "../../types/geo";

export interface GeocoderProvider {
  search(query: string, limit?: number): Promise<GeocodingResult[]>;
}
