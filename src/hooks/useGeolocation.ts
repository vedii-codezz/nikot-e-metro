import { useState, useCallback } from "react";
import { Coordinates } from "../types/geo";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "success"
  | "denied"
  | "unavailable"
  | "error";

export interface GeolocationState {
  status: GeolocationStatus;
  coordinates: Coordinates | null;
  errorMessage: string | null;
  isSimulated?: boolean;
}

// Kolkata Central reference coordinates (BBD Bagh / Esplanade area)
export const KOLKATA_CENTER_COORDINATES: Coordinates = {
  latitude: 22.5697,
  longitude: 88.3517,
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    status: "idle",
    coordinates: null,
    errorMessage: null,
  });

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        status: "unavailable",
        coordinates: null,
        errorMessage: "Geolocation is not supported by your browser.",
      });
      return;
    }

    setState({
      status: "requesting",
      coordinates: null,
      errorMessage: null,
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "success",
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          errorMessage: null,
        });
      },
      (error) => {
        let status: GeolocationStatus = "error";
        let message = "Unable to retrieve your location.";

        if (error.code === error.PERMISSION_DENIED) {
          status = "denied";
          message = "Location access was denied. You can search any place manually.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          status = "unavailable";
          message = "Location information is currently unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out. Please try again.";
        }

        setState({
          status,
          coordinates: null,
          errorMessage: message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const simulateKolkataLocation = useCallback(() => {
    setState({
      status: "success",
      coordinates: KOLKATA_CENTER_COORDINATES,
      errorMessage: null,
      isSimulated: true,
    });
  }, []);

  const resetLocation = useCallback(() => {
    setState({
      status: "idle",
      coordinates: null,
      errorMessage: null,
    });
  }, []);

  return {
    ...state,
    requestLocation,
    simulateKolkataLocation,
    resetLocation,
  };
}
