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

  const [isReranking, setIsReranking] = useState(false);

  // Fetch nearby stations from backend API whenever selectedLocation changes
  useEffect(() => {
    if (!selectedLocation) {
      setNearbyResults([]);
      setSelectedStation(null);
      setIsLoading(false);
      setIsReranking(false);
      return;
    }

    let isMounted = true;
    setError(null);

    // 1. Progressive loading: immediately display local Haversine candidates
    const instantCandidates = rankNearbyStations(selectedLocation.coordinates, METRO_STATIONS, 5);
    setNearbyResults(instantCandidates);
    if (instantCandidates.length > 0) {
      setSelectedStation(instantCandidates[0].station);
    }
    setIsReranking(true);

    const { latitude, longitude } = selectedLocation.coordinates;

    // 2. Fetch real pedestrian routed results from API and rerank
    fetch(`/api/stations/nearby?lat=${latitude}&lng=${longitude}&limit=5`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const results: NearbyStationResult[] = data.data?.results || [];
        if (results.length > 0) {
          setNearbyResults(results);
          setSelectedStation(results[0].station);
        }
      })
      .catch((err) => {
        // Fallback already displayed
        console.warn("[useNearestMetro] Pedestrian reranking failed, preserving proximity fallback:", err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
          setIsReranking(false);
        }
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
    isReranking,
    error,
    setLocation,
    selectStation,
    clear,
  };
}
