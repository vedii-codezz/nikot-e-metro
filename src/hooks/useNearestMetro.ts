import { useState, useCallback, useEffect } from "react";
import { Coordinates, GeocodingResult } from "../types/geo";
import { MetroStation, NearbyStationResult } from "../types/station";
import { METRO_STATIONS } from "../data/stations";
import { rankNearbyStations } from "../lib/geo/haversine";

export function useNearestMetro() {
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null);
  const [selectedStation, setSelectedStation] = useState<MetroStation | null>(null);
  const [nearbyResults, setNearbyResults] = useState<NearbyStationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch nearby stations from backend API whenever selectedLocation changes
  useEffect(() => {
    if (!selectedLocation) {
      setNearbyResults([]);
      setSelectedStation(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const { latitude, longitude } = selectedLocation.coordinates;

    fetch(`/api/stations/nearby?lat=${latitude}&lng=${longitude}&limit=5`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const results: NearbyStationResult[] = data.data?.results || [];
        setNearbyResults(results);
        if (results.length > 0) {
          setSelectedStation(results[0].station);
        }
      })
      .catch(() => {
        // Fallback to local ranking if network or API is offline
        if (!isMounted) return;
        const fallback = rankNearbyStations(selectedLocation.coordinates, METRO_STATIONS, 5);
        setNearbyResults(fallback);
        if (fallback.length > 0) {
          setSelectedStation(fallback[0].station);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedLocation]);

  const recommendedStation = nearbyResults.length > 0 ? nearbyResults[0] : null;
  const secondaryStations = nearbyResults.length > 1 ? nearbyResults.slice(1) : [];

  const setLocation = useCallback((location: GeocodingResult | null) => {
    setSelectedLocation(location);
  }, []);

  const selectStation = useCallback((station: MetroStation | null) => {
    setSelectedStation(station);
  }, []);

  const clear = useCallback(() => {
    setSelectedLocation(null);
    setSelectedStation(null);
    setNearbyResults([]);
    setError(null);
  }, []);

  return {
    selectedLocation,
    selectedStation,
    nearbyResults,
    recommendedStation,
    secondaryStations,
    isLoading,
    error,
    setLocation,
    selectStation,
    clear,
  };
}
