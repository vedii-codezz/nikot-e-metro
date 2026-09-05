"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MetroStation } from "../../types/station";
import { GeocodingResult } from "../../types/geo";
import { JourneyRoute } from "../../types/routing";
import { METRO_STATIONS } from "../../data/stations";
import { METRO_LINES, getLineById } from "../../data/lines";
import { Plus, Minus, Maximize2 } from "lucide-react";

interface MetroMapProps {
  selectedStation: MetroStation | null;
  searchedLocation: GeocodingResult | null;
  activeRoute: JourneyRoute | null;
  onStationSelect?: (station: MetroStation) => void;
}

// Default Carto Dark Matter style (sleek, minimalist urban transit cartography)
const DEFAULT_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Fallback raster OSM style definition in case GL style server is unreachable
const FALLBACK_OSM_STYLE = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const MetroMap: React.FC<MetroMapProps> = ({
  selectedStation,
  searchedLocation,
  activeRoute,
  onStationSelect,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const locationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onStationSelectRef = useRef(onStationSelect);
  useEffect(() => {
    onStationSelectRef.current = onStationSelect;
  }, [onStationSelect]);

  // Helper to render static metro lines and station nodes
  const renderNetworkLayers = useCallback((map: maplibregl.Map) => {
    // 1. Build line GeoJSON
    const lineFeatures = METRO_LINES.map((line) => {
      const lineStations = METRO_STATIONS.filter((s) => s.lineIds.includes(line.id));
      const coordinates = lineStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]);

      return {
        type: "Feature" as const,
        properties: {
          lineId: line.id,
          name: line.name,
          color: line.color,
        },
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
      };
    });

    const linesGeoJSON = {
      type: "FeatureCollection" as const,
      features: lineFeatures,
    };

    if (!map.getSource("metro-lines")) {
      map.addSource("metro-lines", {
        type: "geojson",
        data: linesGeoJSON,
      });

      // Line background glow
      map.addLayer({
        id: "metro-lines-glow",
        type: "line",
        source: "metro-lines",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 8,
          "line-opacity": 0.25,
        },
      });

      // Main line track
      map.addLayer({
        id: "metro-lines-layer",
        type: "line",
        source: "metro-lines",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4.5,
          "line-opacity": 0.9,
        },
      });
    }

    // 2. Build station points GeoJSON
    const stationFeatures = METRO_STATIONS.map((station) => {
      const primaryLine = getLineById(station.lineIds[0]);
      return {
        type: "Feature" as const,
        properties: {
          id: station.id,
          name: station.name,
          bengaliName: station.bengaliName || "",
          color: primaryLine?.color || "#FFFFFF",
          isInterchange: station.isInterchange,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [station.coordinates.longitude, station.coordinates.latitude],
        },
      };
    });

    const stationsGeoJSON = {
      type: "FeatureCollection" as const,
      features: stationFeatures,
    };

    if (!map.getSource("metro-stations")) {
      map.addSource("metro-stations", {
        type: "geojson",
        data: stationsGeoJSON,
      });

      // Station outer circle
      map.addLayer({
        id: "metro-stations-outer",
        type: "circle",
        source: "metro-stations",
        paint: {
          "circle-radius": ["case", ["get", "isInterchange"], 7.5, 5],
          "circle-color": "#0B0F17",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": ["get", "color"],
        },
      });

      // Station inner dot
      map.addLayer({
        id: "metro-stations-inner",
        type: "circle",
        source: "metro-stations",
        paint: {
          "circle-radius": ["case", ["get", "isInterchange"], 3.5, 2],
          "circle-color": "#FFFFFF",
        },
      });

      // Click event on station points
      map.on("click", "metro-stations-outer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const stationId = feature.properties?.id;
        const station = METRO_STATIONS.find((s) => s.id === stationId);
        if (station && onStationSelectRef.current) {
          onStationSelectRef.current(station);
        }
      });

      map.on("mouseenter", "metro-stations-outer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "metro-stations-outer", () => {
        map.getCanvas().style.cursor = "";
      });
    }

    // 3. Dynamic Source for Active Route Polylines
    if (!map.getSource("active-route-line")) {
      map.addSource("active-route-line", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "active-route-line-highlight",
        type: "line",
        source: "active-route-line",
        paint: {
          "line-color": "#FFFFFF",
          "line-width": 6,
          "line-opacity": 0.8,
          "line-dasharray": [1, 1],
        },
      });
    }

    // 4. Proximity straight-line indicator source (searched location to nearest station)
    if (!map.getSource("proximity-line")) {
      map.addSource("proximity-line", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "proximity-line-layer",
        type: "line",
        source: "proximity-line",
        paint: {
          "line-color": "#0072CE",
          "line-width": 2.5,
          "line-dasharray": [2, 2],
          "line-opacity": 0.85,
        },
      });
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let map: maplibregl.Map;

    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: DEFAULT_MAP_STYLE,
        center: [88.3517, 22.5697], // Kolkata Central
        zoom: 12,
        maxZoom: 18,
        minZoom: 9,
        attributionControl: false,
      });
    } catch {
      // Fallback to OSM raster style
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: FALLBACK_OSM_STYLE as any,
        center: [88.3517, 22.5697],
        zoom: 12,
        maxZoom: 18,
        minZoom: 9,
        attributionControl: false,
      });
    }

    mapInstanceRef.current = map;

    map.on("load", () => {
      setMapLoaded(true);
      renderNetworkLayers(map);
    });

    map.on("error", () => {
      // Graceful handler if remote style fails after creation
      if (!map.isStyleLoaded()) {
        try {
          map.setStyle(FALLBACK_OSM_STYLE as any);
        } catch {
          // Ignore
        }
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [renderNetworkLayers]);

  // Synchronize Searched Location Marker & Proximity Indicator
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    // Remove existing marker
    if (locationMarkerRef.current) {
      locationMarkerRef.current.remove();
      locationMarkerRef.current = null;
    }

    if (searchedLocation) {
      const el = document.createElement("div");
      el.className = "w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center animate-bounce";
      const innerDot = document.createElement("div");
      innerDot.className = "w-2 h-2 rounded-full bg-white";
      el.appendChild(innerDot);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([searchedLocation.coordinates.longitude, searchedLocation.coordinates.latitude])
        .addTo(map);

      locationMarkerRef.current = marker;

      // Update straight dashed proximity line if a station is selected
      if (selectedStation) {
        const proximityGeoJSON = {
          type: "FeatureCollection" as const,
          features: [
            {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "LineString" as const,
                coordinates: [
                  [searchedLocation.coordinates.longitude, searchedLocation.coordinates.latitude],
                  [selectedStation.coordinates.longitude, selectedStation.coordinates.latitude],
                ],
              },
            },
          ],
        };

        const source = map.getSource("proximity-line") as maplibregl.GeoJSONSource;
        source?.setData(proximityGeoJSON);

        // Fit map bounds to show both searched location and nearest station
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([searchedLocation.coordinates.longitude, searchedLocation.coordinates.latitude]);
        bounds.extend([selectedStation.coordinates.longitude, selectedStation.coordinates.latitude]);
        map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 1000 });
      } else {
        map.flyTo({
          center: [searchedLocation.coordinates.longitude, searchedLocation.coordinates.latitude],
          zoom: 14,
          duration: 1000,
        });
      }
    } else {
      // Clear proximity line
      const source = map.getSource("proximity-line") as maplibregl.GeoJSONSource;
      source?.setData({ type: "FeatureCollection", features: [] });
    }
  }, [searchedLocation, selectedStation, mapLoaded]);

  // Synchronize Active Calculated Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("active-route-line") as maplibregl.GeoJSONSource;
    if (!source) return;

    if (activeRoute) {
      // Collect station coordinates in journey sequence
      const routeCoords: [number, number][] = [];

      for (const seg of activeRoute.segments) {
        if (seg.type === "first_mile_walk") {
          routeCoords.push([seg.originCoordinates.longitude, seg.originCoordinates.latitude]);
          routeCoords.push([seg.targetStation.coordinates.longitude, seg.targetStation.coordinates.latitude]);
        } else if (seg.type === "metro_ride") {
          for (const st of seg.stations) {
            routeCoords.push([st.coordinates.longitude, st.coordinates.latitude]);
          }
        } else if (seg.type === "last_mile_walk") {
          routeCoords.push([seg.destinationCoordinates.longitude, seg.destinationCoordinates.latitude]);
        }
      }

      source.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: routeCoords,
            },
          },
        ],
      });

      // Fit bounds to full route
      if (routeCoords.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const [lng, lat] of routeCoords) {
          bounds.extend([lng, lat]);
        }
        map.fitBounds(bounds, { padding: 90, duration: 1200, maxZoom: 15 });
      }
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, [activeRoute, mapLoaded]);

  // Map Controls Handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetKolkata = () => {
    mapInstanceRef.current?.flyTo({
      center: [88.3517, 22.5697],
      zoom: 12,
      duration: 1000,
    });
  };

  return (
    <div className="relative w-full h-full min-h-[350px] bg-transit-bg">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Map Zoom Controls */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5 bg-transit-card/90 backdrop-blur-sm border border-transit-border p-1 rounded-lg shadow-lg">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 text-transit-muted hover:text-transit-text hover:bg-transit-cardHover rounded transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 text-transit-muted hover:text-transit-text hover:bg-transit-cardHover rounded transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetKolkata}
          className="p-2 text-transit-muted hover:text-transit-text hover:bg-transit-cardHover rounded transition-colors border-t border-transit-border mt-0.5"
          title="Reset to Kolkata Network View"
          aria-label="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Map Legend Overlay (Minimal) */}
      <div className="absolute bottom-4 left-4 z-10 bg-transit-card/90 backdrop-blur-sm border border-transit-border px-3 py-2 rounded-lg shadow-lg text-[11px] text-transit-muted space-y-1.5 hidden sm:block">
        <div className="font-semibold text-transit-text text-[10px] uppercase tracking-wider">
          Metro Network
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0072CE]" />
            <span>Line 1 (Blue)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A651]" />
            <span>Line 2 (Green)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7B2CBF]" />
            <span>Line 3 (Purple)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF7900]" />
            <span>Line 6 (Orange)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
