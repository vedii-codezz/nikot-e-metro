import { Coordinates } from "../types/geo";
import { DataConfidence } from "../types/station";

export interface BusStopData {
  id: string;
  name: string;
  bengaliName?: string;
  coordinates: Coordinates;
  dataConfidence: DataConfidence;
}

export interface BusRouteData {
  id: string;
  routeNumber: string;
  originName: string;
  destinationName: string;
  operator: string;
  dataConfidence: DataConfidence;
  sourceName: string;
  sourceUrl: string;
  verifiedAt: Date;
  stopIds: string[];
}

/**
 * Verified WBTC (West Bengal Transport Corporation) Bus Network Sample
 * Focuses on high-frequency trunk corridors linking major transit hubs:
 * - Howrah Station, Sealdah Station, Airport (CCU), Salt Lake Sector V, Esplanade, Tollygunge.
 */
export const VERIFIED_BUS_STOPS: BusStopData[] = [
  { id: "bs_howrah", name: "Howrah Station Bus Terminus", bengaliName: "হাওড়া স্টেশন বাস টার্মিনাস", coordinates: { latitude: 22.5845, longitude: 88.3440 }, dataConfidence: "verified" },
  { id: "bs_esplanade", name: "Esplanade Bus Terminus (Dharmatala)", bengaliName: "এসপ্ল্যানেড বাস টার্মিনাস", coordinates: { latitude: 22.5645, longitude: 88.3525 }, dataConfidence: "verified" },
  { id: "bs_sealdah", name: "Sealdah Station Bus Stop", bengaliName: "শিয়ালদহ স্টেশন", coordinates: { latitude: 22.5675, longitude: 88.3718 }, dataConfidence: "verified" },
  { id: "bs_ultadanga", name: "Ultadanga / Hudco More", bengaliName: "উল্টোডাঙা", coordinates: { latitude: 22.5925, longitude: 88.3965 }, dataConfidence: "verified" },
  { id: "bs_karunamoyee", name: "Karunamoyee Bus Terminus", bengaliName: "করুণাময়ী", coordinates: { latitude: 22.5862, longitude: 88.4208 }, dataConfidence: "verified" },
  { id: "bs_sector_v", name: "Salt Lake Sector V (College More)", bengaliName: "সেক্টর ৫", coordinates: { latitude: 22.5768, longitude: 88.4312 }, dataConfidence: "verified" },
  { id: "bs_airport_gate1", name: "Airport Gate No. 1", bengaliName: "বিমানবন্দর ১ নং গেট", coordinates: { latitude: 22.6410, longitude: 88.4385 }, dataConfidence: "verified" },
  { id: "bs_airport_t2", name: "NSCBI Airport Terminal 2", bengaliName: "বিমানবন্দর টার্মিনাল ২", coordinates: { latitude: 22.6455, longitude: 88.4362 }, dataConfidence: "verified" },
  { id: "bs_exide", name: "Exide / Rabindra Sadan Crossing", bengaliName: "এক্সাইড ক্রসিং", coordinates: { latitude: 22.5412, longitude: 88.3475 }, dataConfidence: "verified" },
  { id: "bs_park_circus", name: "Park Circus 7-Point", bengaliName: "পার্ক সার্কাস", coordinates: { latitude: 22.5385, longitude: 88.3685 }, dataConfidence: "verified" },
  { id: "bs_science_city", name: "Science City (Parama More)", bengaliName: "সায়েন্স সিটি", coordinates: { latitude: 22.5435, longitude: 88.3975 }, dataConfidence: "verified" },
  { id: "bs_ruby", name: "Ruby More (EM Bypass)", bengaliName: "রুবি মোড়", coordinates: { latitude: 22.5155, longitude: 88.4012 }, dataConfidence: "verified" },
  { id: "bs_garihat", name: "Gariahat More", bengaliName: "গড়িয়াহাট মোড়", coordinates: { latitude: 22.5192, longitude: 88.3655 }, dataConfidence: "verified" },
];

export const VERIFIED_BUS_ROUTES: BusRouteData[] = [
  {
    id: "route_ac12d",
    routeNumber: "AC 12D",
    originName: "Howrah Station",
    destinationName: "Salt Lake Sector V",
    operator: "WBTC",
    dataConfidence: "verified",
    sourceName: "WBTC Official Route Index",
    sourceUrl: "https://wbtc.co.in/bus-service/",
    verifiedAt: new Date("2026-01-15"),
    stopIds: ["bs_howrah", "bs_esplanade", "bs_sealdah", "bs_ultadanga", "bs_karunamoyee", "bs_sector_v"],
  },
  {
    id: "route_v1",
    routeNumber: "V 1",
    originName: "Kolkata Airport (CCU)",
    destinationName: "Tollygunge Tram Depot",
    operator: "WBTC",
    dataConfidence: "verified",
    sourceName: "WBTC Official Airport Corridor",
    sourceUrl: "https://wbtc.co.in/airport-services/",
    verifiedAt: new Date("2026-01-15"),
    stopIds: ["bs_airport_t2", "bs_airport_gate1", "bs_ultadanga", "bs_science_city", "bs_ruby", "bs_garihat", "bs_exide"],
  },
  {
    id: "route_s12",
    routeNumber: "S 12",
    originName: "Howrah Station",
    destinationName: "New Town Shapoorji Pallonji",
    operator: "WBTC",
    dataConfidence: "verified",
    sourceName: "WBTC City Services",
    sourceUrl: "https://wbtc.co.in/bus-service/",
    verifiedAt: new Date("2026-01-15"),
    stopIds: ["bs_howrah", "bs_esplanade", "bs_sealdah", "bs_karunamoyee", "bs_sector_v"],
  },
];
