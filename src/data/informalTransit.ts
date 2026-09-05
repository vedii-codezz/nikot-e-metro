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
  sourceUrl: string;
  verifiedAt: Date;
}

/**
 * Community and traffic-police documented auto-rickshaw and toto (e-rickshaw) stands
 * directly connected to Kolkata Metro stations.
 * Note: Classified with 'development' confidence because informal transit routes operate
 * under municipal traffic police guidelines rather than published official GTFS transit feeds.
 */
export const VERIFIED_INFORMAL_STANDS: InformalTransitStandData[] = [
  {
    id: "stand_kalighat_auto",
    name: "Kalighat Metro Auto Stand",
    type: "auto",
    coordinates: { latitude: 22.5178, longitude: 88.3468 },
    nearbyMetroStationId: "kalighat",
    routesServed: "Kalighat Metro ↔ Gariahat, Kalighat Metro ↔ Rashbehari",
    dataConfidence: "development",
    sourceName: "Kolkata Traffic Police Auto Stand Guidelines",
    sourceUrl: "https://kolkatatrafficpolice.gov.in/",
    verifiedAt: new Date("2026-01-15"),
  },
  {
    id: "stand_ultadanga_auto",
    name: "Ultadanga Auto Stand (Bidhan Nagar Road)",
    type: "auto",
    coordinates: { latitude: 22.5930, longitude: 88.3970 },
    nearbyMetroStationId: "bengal_chemical",
    routesServed: "Ultadanga ↔ Salt Lake Karunamoyee / Sector V",
    dataConfidence: "development",
    sourceName: "Salt Lake Feeder Corridor Physical Survey",
    sourceUrl: "https://transport.wb.gov.in/",
    verifiedAt: new Date("2026-01-15"),
  },
  {
    id: "stand_dumdum_auto",
    name: "Dum Dum Metro Auto Stand",
    type: "auto",
    coordinates: { latitude: 22.6225, longitude: 88.3945 },
    nearbyMetroStationId: "dum_dum",
    routesServed: "Dum Dum Metro ↔ Nagerbazar, Dum Dum Metro ↔ Chiria More",
    dataConfidence: "development",
    sourceName: "Dum Dum Municipality Transport Stand Index",
    sourceUrl: "https://transport.wb.gov.in/",
    verifiedAt: new Date("2026-01-15"),
  },
  {
    id: "stand_noapara_toto",
    name: "Noapara Metro E-Rickshaw (Toto) Stand",
    type: "toto",
    coordinates: { latitude: 22.6380, longitude: 88.3892 },
    nearbyMetroStationId: "noapara",
    routesServed: "Noapara Metro ↔ Baranagar Bazar, Noapara ↔ Tobin Road",
    dataConfidence: "development",
    sourceName: "Baranagar E-Rickshaw Feeder Mapping",
    sourceUrl: "https://transport.wb.gov.in/",
    verifiedAt: new Date("2026-01-15"),
  },
  {
    id: "stand_ruby_auto",
    name: "Ruby More Auto Stand",
    type: "auto",
    coordinates: { latitude: 22.5148, longitude: 88.4015 },
    nearbyMetroStationId: "hemanta_mukhopadhyay",
    routesServed: "Ruby ↔ Gariahat, Ruby ↔ Jadavpur 8B",
    dataConfidence: "development",
    sourceName: "EM Bypass Feeder Route Survey",
    sourceUrl: "https://kolkatatrafficpolice.gov.in/",
    verifiedAt: new Date("2026-01-15"),
  },
];
