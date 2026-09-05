import { useState, useCallback, useEffect } from "react";
import { GeocodingResult } from "../types/geo";
import { JourneyRoute } from "../types/routing";
import { MultimodalJourneyCandidate, RoutingOptimizationPreference } from "../types/multimodal";
import { METRO_STATIONS } from "../data/stations";
import { buildMetroGraph } from "../lib/routing/graph";
import { planFullJourney } from "../lib/routing/dijkstra";

export function useMetroRouter() {
  const [origin, setOrigin] = useState<GeocodingResult | null>(null);
  const [destination, setDestination] = useState<GeocodingResult | null>(null);
  const [route, setRoute] = useState<JourneyRoute | null>(null);
  const [candidates, setCandidates] = useState<MultimodalJourneyCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<MultimodalJourneyCandidate | null>(null);
  const [preference, setPreference] = useState<RoutingOptimizationPreference>("recommended");
  const [rideHail, setRideHail] = useState<{ uber?: string; ola?: string; rapido?: string } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute calculated route via backend POST /api/routes with fallback
  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
      setCandidates([]);
      setSelectedCandidate(null);
      setRideHail(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsCalculating(true);
    setError(null);

    const payload = {
      origin: {
        name: origin.name,
        coordinates: origin.coordinates,
        stationId: origin.source === "station" ? origin.id.replace("st_", "") : undefined,
      },
      destination: {
        name: destination.name,
        coordinates: destination.coordinates,
        stationId: destination.source === "station" ? destination.id.replace("st_", "") : undefined,
      },
      mode: preference,
    };

    fetch("/api/routes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setRoute(data.data?.route || null);
        const allCandidates: MultimodalJourneyCandidate[] = [];
        if (data.data?.multimodalCandidate) {
          allCandidates.push(data.data.multimodalCandidate);
        }
        if (data.data?.alternatives) {
          allCandidates.push(...data.data.alternatives);
        }
        setCandidates(allCandidates);
        setSelectedCandidate(data.data?.multimodalCandidate || null);
        setRideHail(data.data?.rideHail || null);
      })
      .catch(() => {
        // Fallback to client-side graph routing
        if (!isMounted) return;
        const graph = buildMetroGraph(METRO_STATIONS);
        const fallbackRoute = planFullJourney(
          graph,
          METRO_STATIONS,
          payload.origin,
          payload.destination
        );
        setRoute(fallbackRoute);
        setCandidates([]);
        setSelectedCandidate(null);
        setRideHail(null);
      })
      .finally(() => {
        if (isMounted) setIsCalculating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [origin, destination, preference]);

  const swapOriginDestination = useCallback(() => {
    setOrigin((prevOrigin) => {
      setDestination(prevOrigin);
      return destination;
    });
  }, [destination]);

  const selectCandidate = useCallback((cand: MultimodalJourneyCandidate) => {
    setSelectedCandidate(cand);
  }, []);

  const clear = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setRoute(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setRideHail(null);
    setIsCalculating(false);
    setError(null);
  }, []);

  return {
    origin,
    destination,
    route,
    candidates,
    selectedCandidate,
    preference,
    rideHail,
    isCalculating,
    error,
    setOrigin,
    setDestination,
    setPreference,
    selectCandidate,
    swapOriginDestination,
    clear,
  };
}

