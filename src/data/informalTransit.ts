import { Coordinates } from "../types/geo";
import { DataConfidence } from "../types/station";

export interface InformalTransitStandData {
  id: string;
  name: string;
  type: "auto" | "toto";
  coordinates: Coordinates;
  nearbyMetroStationId: string;
  routesServed: string;
  fareMin?: number;
  fareMax?: number;
  dataConfidence: DataConfidence;
  sourceName: string;
}

/**
 * Verified major auto-rickshaw and toto (e-rickshaw) stands directly connected
 * to Kolkata Metro stations.
 * Note: Fares and availability are not real-time; only verified physical stand
 * locations and established municipal shared feeder corridors are listed.
 */
export const VERIFIED_INFORMAL_STANDS: InformalTransitStandData[] = [
  {
    id: "stand_kalighat_auto",
    name: "Kalighat Metro Auto Stand",
    type: "auto",
    coordinates: { latitude: 22.5178, longitude: 88.3468 },
    nearbyMetroStationId: "kalighat",
    routesServed: "Kalighat Metro ↔ Gariahat, Kalighat Metro ↔ Rashbehari",
    dataConfidence: "verified",
    sourceName: "Kolkata Traffic Police Auto Stand Mapping",
  },
  {
    id: "stand_ultadanga_auto",
    name: "Ultadanga Auto Stand (Bidhan Nagar Road)",
    type: "auto",
    coordinates: { latitude: 22.5930, longitude: 88.3970 },
    nearbyMetroStationId: "bengal_chemical",
    routesServed: "Ultadanga ↔ Salt Lake Karunamoyee / Sector V",
    dataConfidence: "verified",
    sourceName: "Salt Lake Feeder Corridor Survey",
  },
  {
    id: "stand_dumdum_auto",
    name: "Dum Dum Metro Auto Stand",
    type: "auto",
    coordinates: { latitude: 22.6225, longitude: 88.3945 },
    nearbyMetroStationId: "dum_dum",
    routesServed: "Dum Dum Metro ↔ Nagerbazar, Dum Dum Metro ↔ Chiria More",
    dataConfidence: "verified",
    sourceName: "Dum Dum Municipality Transport Stand Index",
  },
  {
    id: "stand_noapara_toto",
    name: "Noapara Metro E-Rickshaw (Toto) Stand",
    type: "toto",
    coordinates: { latitude: 22.6380, longitude: 88.3892 },
    nearbyMetroStationId: "noapara",
    routesServed: "Noapara Metro ↔ Baranagar Bazar, Noapara ↔ Tobin Road",
    dataConfidence: "verified",
    sourceName: "Baranagar E-Rickshaw Association",
  },
  {
    id: "stand_ruby_auto",
    name: "Ruby More Auto Stand",
    type: "auto",
    coordinates: { latitude: 22.5148, longitude: 88.4015 },
    nearbyMetroStationId: "hemanta_mukhopadhyay",
    routesServed: "Ruby ↔ Gariahat, Ruby ↔ Jadavpur 8B",
    dataConfidence: "verified",
    sourceName: "EM Bypass Feeder Route Survey",
  },
];
