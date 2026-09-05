import { Coordinates } from "../../types/geo";

export interface RideHailingProvider {
  name: "uber" | "ola" | "rapido";
  displayName: string;
  isOfficialDeepLinkSupported: boolean;
  getDeepLink(origin: Coordinates, destination: Coordinates, dropoffName?: string): string;
}

/**
 * Uber Universal Web / App Deep-Link Generator
 * Official documented URL scheme: https://m.uber.com/ul/?action=setPickup
 */
export class UberRideHailingProvider implements RideHailingProvider {
  name = "uber" as const;
  displayName = "Uber";
  isOfficialDeepLinkSupported = true;

  getDeepLink(origin: Coordinates, destination: Coordinates, dropoffName?: string): string {
    const params = new URLSearchParams({
      action: "setPickup",
      "pickup[latitude]": origin.latitude.toString(),
      "pickup[longitude]": origin.longitude.toString(),
      "dropoff[latitude]": destination.latitude.toString(),
      "dropoff[longitude]": destination.longitude.toString(),
    });
    if (dropoffName) {
      params.set("dropoff[nickname]", dropoffName);
    }
    return `https://m.uber.com/ul/?${params.toString()}`;
  }
}

/**
 * Ola App Deep-Link Generator
 * Official mobile URL scheme: ola://manage_ride
 */
export class OlaRideHailingProvider implements RideHailingProvider {
  name = "ola" as const;
  displayName = "Ola";
  isOfficialDeepLinkSupported = true;

  getDeepLink(origin: Coordinates, destination: Coordinates, dropoffName?: string): string {
    const params = new URLSearchParams({
      pickup_lat: origin.latitude.toString(),
      pickup_lng: origin.longitude.toString(),
      drop_lat: destination.latitude.toString(),
      drop_lng: destination.longitude.toString(),
    });
    if (dropoffName) {
      params.set("drop_name", dropoffName);
    }
    return `ola://manage_ride?${params.toString()}`;
  }
}

/**
 * Rapido Deep-Link Provider
 * Note: Rapido lacks an official universal web deep-link with guaranteed coordinate prefill.
 * We provide a clean fallback URL to avoid reverse-engineering undocumented endpoints.
 */
export class RapidoRideHailingProvider implements RideHailingProvider {
  name = "rapido" as const;
  displayName = "Rapido";
  isOfficialDeepLinkSupported = false; // Reported as known limitation

  getDeepLink(): string {
    return "https://www.rapido.bike/";
  }
}

export const rideHailingProviders = {
  uber: new UberRideHailingProvider(),
  ola: new OlaRideHailingProvider(),
  rapido: new RapidoRideHailingProvider(),
};
