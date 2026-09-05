import { useState, useCallback, useEffect } from "react";
import { GeocodingResult } from "../types/geo";
import { JourneyRoute } from "../types/routing";
import { METRO_STATIONS } from "../data/stations";
import { buildMetroGraph } from "../lib/routing/graph";
import { planFullJourney } from "../lib/routing/dijkstra";

export function useMetroRouter() {
  const [origin, setOrigin] = useState<GeocodingResult | null>(null);
  const [destination, setDestination] = useState<GeocodingResult | null>(null);
  const [route, setRoute] = useState<JourneyRoute | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute calculated route via backend POST /api/routes with fallback
  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null);
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
      mode: "recommended",
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
      })
      .finally(() => {
        if (isMounted) setIsCalculating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [origin, destination]);

  const swapOriginDestination = useCallback(() => {
    setOrigin((prevOrigin) => {
      setDestination(prevOrigin);
      return destination;
    });
  }, [destination]);

  const clear = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setRoute(null);
    setIsCalculating(false);
    setError(null);
  }, []);

  return {
    origin,
    destination,
    route,
    isCalculating,
    error,
    setOrigin,
    setDestination,
    swapOriginDestination,
    clear,
  };
}
