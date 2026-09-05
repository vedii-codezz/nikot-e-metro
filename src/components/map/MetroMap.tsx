"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MetroStation } from "../../types/station";
import { GeocodingResult } from "../../types/geo";
import { JourneyRoute } from "../../types/routing";
import { METRO_STATIONS } from "../../data/stations";
import { getLineById } from "../../data/lines";
import { HOOGHLY_RIVER_GEOJSON } from "../../data/hooghlyRiver";
import { Plus, Minus, Maximize2, Layers, MapPin, Eye, Compass } from "lucide-react";

interface MetroMapProps {
  selectedStation: MetroStation | null;
  searchedLocation: GeocodingResult | null;
  activeRoute: JourneyRoute | null;
  selectedSegmentIndex?: number | null;
  onStationSelect?: (station: MetroStation) => void;
  walkingGeometry?: {
    type: "LineString";
    coordinates: [number, number][];
  } | null;
}

// Default Carto Dark Matter style (minimal dark graphite canvas)
const DARK_MATTER_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Positron style for Street Mode
const POSITRON_STREET_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Fallback raster OSM style definition
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
  selectedSegmentIndex,
  onStationSelect,
  walkingGeometry,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const locationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Map presentation mode: "network" (transit-dominant, dark graphite) vs "street" (contextual roads & landmarks)
  const [mapMode, setMapMode] = useState<"network" | "street">("network");

  // Layer toggles
  const [showConstruction, setShowConstruction] = useState(true);
  const [showPlanned, setShowPlanned] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  const onStationSelectRef = useRef(onStationSelect);
  useEffect(() => {
    onStationSelectRef.current = onStationSelect;
  }, [onStationSelect]);

  // Helper to extract stations in order
  const getOrderedStations = (ids: string[]) =>
    ids.map((id) => METRO_STATIONS.find((s) => s.id === id)).filter(Boolean) as typeof METRO_STATIONS;

  // Render static Kolkata Metro cartography layers
  const renderNetworkLayers = useCallback(
    (map: maplibregl.Map) => {
      // 0. Base Hooghly River polygon layer (Anchors Kolkata-Howrah geography)
      if (!map.getSource("hooghly-river")) {
        map.addSource("hooghly-river", {
          type: "geojson",
          data: HOOGHLY_RIVER_GEOJSON,
        });

        map.addLayer({
          id: "hooghly-river-layer",
          type: "fill",
          source: "hooghly-river",
          paint: {
            "fill-color": "#111E2E",
            "fill-opacity": 0.85,
          },
        });

        map.addLayer({
          id: "hooghly-river-stroke",
          type: "line",
          source: "hooghly-river",
          paint: {
            "line-color": "#1A324B",
            "line-width": 1.5,
            "line-opacity": 0.9,
          },
        });
      }

      // 1. Build line GeoJSON separating operational vs construction/planned sections
      const lineFeatures: any[] = [];
      const plannedLineFeatures: any[] = [];

      // --- BLUE LINE: Operational ---
      const blueStations = METRO_STATIONS.filter((s) => s.lineIds.includes("blue"));
      if (blueStations.length > 1) {
        lineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "blue", name: "Blue Line (North-South)", color: "#0072CE", status: "operational" },
          geometry: {
            type: "LineString" as const,
            coordinates: blueStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      // --- GREEN LINE: Continuous Operational Corridor (Howrah Maidan to Sector V) ---
      const greenOrder = [
        "howrah_maidan", "howrah", "mahadan_underwater", "esplanade_green",
        "sealdah", "phoolbagan", "salt_lake_stadium", "bengal_chemical",
        "city_centre", "central_park", "karunamoyee", "salt_lake_sector_v"
      ];
      const greenStations = getOrderedStations(greenOrder);
      if (greenStations.length > 1) {
        lineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "green", name: "Green Line (East-West Continuous)", color: "#00A651", status: "operational" },
          geometry: {
            type: "LineString" as const,
            coordinates: greenStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      // --- YELLOW LINE: Operational Section (Noapara to Jai Hind) ---
      const yellowOrder = ["noapara", "dum_dum_cantonment", "jessore_road", "jai_hind"];
      const yellowStations = getOrderedStations(yellowOrder);
      if (yellowStations.length > 1) {
        lineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "yellow", name: "Yellow Line (Noapara - Airport)", color: "#FCCC0A", status: "operational" },
          geometry: {
            type: "LineString" as const,
            coordinates: yellowStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      // --- YELLOW LINE: Construction Extension (Jai Hind to Barasat) ---
      const yellowConstOrder = [
        "jai_hind", "birati", "michael_nagar", "new_barrackpore", "madhyamgram", "hridaypur", "barasat"
      ];
      const yellowConstStations = getOrderedStations(yellowConstOrder);
      if (yellowConstStations.length > 1) {
        plannedLineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "yellow", name: "Yellow Line (Airport - Barasat Extension)", color: "#FCCC0A", status: "under_construction" },
          geometry: {
            type: "LineString" as const,
            coordinates: yellowConstStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      // --- PURPLE LINE: Operational Section (Joka to Majerhat) ---
      const purpleOrder = ["joka", "thakurpukur", "sakherbazar", "behala_chowrasta", "behala_bazar", "taratala", "majerhat"];
      const purpleStations = getOrderedStations(purpleOrder);
      if (purpleStations.length > 1) {
        lineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "purple", name: "Purple Line", color: "#800080", status: "operational" },
          geometry: {
            type: "LineString" as const,
            coordinates: purpleStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      // --- PURPLE LINE: Construction Section (Majerhat to Esplanade) ---
      const purpleConstOrder = [
        "majerhat", "mominpur", "kidderpore", "victoria_purple", "park_street_purple", "esplanade_purple"
      ];
      const purpleConstStations = getOrderedStations(purpleConstOrder);
      if (purpleConstStations.length > 1) {
        plannedLineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "purple", name: "Purple Line (Majerhat - Esplanade Extension)", color: "#800080", status: "under_construction" },
          geometry: {
            type: "LineString" as const,
            coordinates: purpleConstStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      // --- ORANGE LINE: Operational Section (Kavi Subhash to Beleghata) ---
      const orangeOrder = [
        "kavi_subhash", "satyajit_ray", "jyotirindra_nandi", "kavi_sukanta",
        "hemanta_mukhopadhyay", "vip_bazar", "ritwik_ghatak", "barun_sengupta", "beleghata"
      ];
      const orangeStations = getOrderedStations(orangeOrder);
      if (orangeStations.length > 1) {
        lineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "orange", name: "Orange Line (Kavi Subhash - Beleghata)", color: "#FF8000", status: "operational" },
          geometry: {
            type: "LineString" as const,
            coordinates: orangeStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      // --- ORANGE LINE: Construction Extension (Beleghata to Airport) ---
      const orangeConstOrder = [
        "beleghata", "gour_kishore_ghosh", "nalban", "it_centre", "nazrul_tirtha",
        "biswa_bangla_convention_centre", "eco_park", "city_centre_2", "chinar_park", "vip_road", "jai_hind"
      ];
      const orangeConstStations = getOrderedStations(orangeConstOrder);
      if (orangeConstStations.length > 1) {
        plannedLineFeatures.push({
          type: "Feature" as const,
          properties: { lineId: "orange", name: "Orange Line (Beleghata - Airport Extension)", color: "#FF8000", status: "under_construction" },
          geometry: {
            type: "LineString" as const,
            coordinates: orangeConstStations.map((s) => [s.coordinates.longitude, s.coordinates.latitude]),
          },
        });
      }

      const linesGeoJSON = { type: "FeatureCollection" as const, features: lineFeatures };
      const plannedLinesGeoJSON = { type: "FeatureCollection" as const, features: plannedLineFeatures };

      if (!map.getSource("metro-lines")) {
        map.addSource("metro-lines", { type: "geojson", data: linesGeoJSON });

        // High-contrast dark halo under operational line track
        map.addLayer({
          id: "metro-lines-halo",
          type: "line",
          source: "metro-lines",
          paint: {
            "line-color": "#05080E",
            "line-width": 8,
            "line-opacity": 0.9,
          },
        });

        // Crisp operational line track
        map.addLayer({
          id: "metro-lines-layer",
          type: "line",
          source: "metro-lines",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 4.5,
            "line-opacity": 0.95,
          },
        });
      }

      if (!map.getSource("metro-lines-planned")) {
        map.addSource("metro-lines-planned", { type: "geojson", data: plannedLinesGeoJSON });

        // Under construction / planned secondary dashed track
        map.addLayer({
          id: "metro-lines-planned-layer",
          type: "line",
          source: "metro-lines-planned",
          paint: {
            "line-color": ["get", "color"],
            "line-width": 3.0,
            "line-dasharray": [3, 2.5],
            "line-opacity": 0.55,
          },
        });
      }

      // 2. Build station points GeoJSON with progressive disclosure zoom priorities
      const majorHubIds = [
        "dakshineswar", "noapara", "howrah_maidan", "howrah", "esplanade", "esplanade_green",
        "sealdah", "salt_lake_sector_v", "kavi_subhash", "jai_hind", "joka", "majerhat"
      ];

      const stationFeatures = METRO_STATIONS.map((station) => {
        const primaryLine = getLineById(station.lineIds[0]);
        const isOperational = !station.status || station.status === "operational";
        const isMajor = majorHubIds.includes(station.id) || station.isInterchange;

        return {
          type: "Feature" as const,
          properties: {
            id: station.id,
            name: station.name,
            bengaliName: station.bengaliName || "",
            color: primaryLine?.color || "#FFFFFF",
            isInterchange: station.isInterchange,
            isOperational,
            isMajor,
            status: station.status || "operational",
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

        // Outer concentric marker ring
        map.addLayer({
          id: "metro-stations-outer",
          type: "circle",
          source: "metro-stations",
          paint: {
            "circle-radius": [
              "case",
              ["get", "isInterchange"],
              8.5,
              ["get", "isOperational"],
              5.5,
              4.0, // Construction smaller hollow ring
            ],
            "circle-color": [
              "case",
              ["get", "isOperational"],
              "#05080E",
              "#0B0F17",
            ],
            "circle-stroke-width": [
              "case",
              ["get", "isInterchange"],
              3.0,
              2.0,
            ],
            "circle-stroke-color": [
              "case",
              ["get", "isOperational"],
              ["get", "color"],
              "#64748B",
            ],
            "circle-opacity": 1.0,
          },
        });

        // Inner marker core (distinct ◎ for interchange, ● for operational)
        map.addLayer({
          id: "metro-stations-inner",
          type: "circle",
          source: "metro-stations",
          paint: {
            "circle-radius": [
              "case",
              ["get", "isInterchange"],
              3.5,
              ["get", "isOperational"],
              2.5,
              1.2,
            ],
            "circle-color": [
              "case",
              ["get", "isInterchange"],
              "#FFFFFF",
              ["get", "isOperational"],
              "#FFFFFF",
              "transparent",
            ],
          },
        });

        // Zoom-Dependent Progressive Disclosure Station Labels (High typography, collision handling)
        map.addLayer({
          id: "metro-stations-labels",
          type: "symbol",
          source: "metro-stations",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10, 10,
              13, 12,
              16, 14,
            ],
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-optional": true,
            // Collision handling: low zoom displays only major hubs/interchanges
            "text-allow-overlap": false,
            "text-ignore-placement": false,
          },
          paint: {
            "text-color": "#F8FAFC",
            "text-halo-color": "#05080E",
            "text-halo-width": 2.5,
            "text-opacity": [
              "case",
              ["get", "isMajor"],
              1.0,
              [">=", ["zoom"], 12.0],
              1.0,
              0.0,
            ],
          },
        });

        // Station Selection / Click event
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

      // 3. Dynamic Source for Active Journey Polylines (With high-contrast halo & directional emphasis)
      if (!map.getSource("active-route-line")) {
        map.addSource("active-route-line", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        // Dark halo underlay for active route
        map.addLayer({
          id: "active-route-halo",
          type: "line",
          source: "active-route-line",
          paint: {
            "line-color": "#000000",
            "line-width": 9,
            "line-opacity": 0.85,
          },
        });

        // Active route vibrant polyline
        map.addLayer({
          id: "active-route-line-layer",
          type: "line",
          source: "active-route-line",
          paint: {
            "line-color": "#38BDF8",
            "line-width": 5,
            "line-opacity": 1.0,
          },
        });
      }

      // 4. Proximity / First-mile indicator source
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
            "line-width": 3.0,
            "line-dasharray": [2, 2],
            "line-opacity": 0.9,
          },
        });
      }
    },
    []
  );

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let map: maplibregl.Map;

    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapMode === "network" ? DARK_MATTER_STYLE : POSITRON_STREET_STYLE,
        center: [88.3517, 22.5697], // Kolkata Central
        zoom: 12,
        maxZoom: 18,
        minZoom: 9,
        attributionControl: false,
      });
    } catch {
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
      if (!map.isStyleLoaded()) {
        try {
          map.setStyle(FALLBACK_OSM_STYLE as any);
        } catch {
          // Fallback handled
        }
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [renderNetworkLayers, mapMode]);

  // Synchronize Journey Dimming State (When route is active, dim non-active network to ~25%)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer("metro-lines-layer")) {
      map.setPaintProperty(
        "metro-lines-layer",
        "line-opacity",
        activeRoute ? 0.25 : 0.95
      );
    }
    if (map.getLayer("metro-lines-halo")) {
      map.setPaintProperty(
        "metro-lines-halo",
        "line-opacity",
        activeRoute ? 0.15 : 0.9
      );
    }
    if (map.getLayer("metro-stations-outer")) {
      map.setPaintProperty(
        "metro-stations-outer",
        "circle-opacity",
        activeRoute ? 0.35 : 1.0
      );
    }
  }, [activeRoute, mapLoaded]);

  // Synchronize Layer Toggles (Construction / Planned)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer("metro-lines-planned-layer")) {
      map.setLayoutProperty(
        "metro-lines-planned-layer",
        "visibility",
        showConstruction ? "visible" : "none"
      );
    }
  }, [showConstruction, mapLoaded]);

  // Synchronize Searched Location Marker & Proximity Indicator
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (locationMarkerRef.current) {
      locationMarkerRef.current.remove();
      locationMarkerRef.current = null;
    }

    if (searchedLocation) {
      const el = document.createElement("div");
      el.className =
        "w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-xl flex items-center justify-center animate-pulse";
      const innerDot = document.createElement("div");
      innerDot.className = "w-2 h-2 rounded-full bg-white";
      el.appendChild(innerDot);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([searchedLocation.coordinates.longitude, searchedLocation.coordinates.latitude])
        .addTo(map);

      locationMarkerRef.current = marker;

      if (selectedStation) {
        const coords: [number, number][] =
          walkingGeometry && walkingGeometry.coordinates.length > 1
            ? walkingGeometry.coordinates
            : [
                [searchedLocation.coordinates.longitude, searchedLocation.coordinates.latitude],
                [selectedStation.coordinates.longitude, selectedStation.coordinates.latitude],
              ];

        const proximityGeoJSON = {
          type: "FeatureCollection" as const,
          features: [
            {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "LineString" as const,
                coordinates: coords,
              },
            },
          ],
        };

        const source = map.getSource("proximity-line") as maplibregl.GeoJSONSource;
        source?.setData(proximityGeoJSON);

        const bounds = new maplibregl.LngLatBounds();
        for (const [lng, lat] of coords) {
          bounds.extend([lng, lat]);
        }
        map.fitBounds(bounds, { padding: 90, maxZoom: 15, duration: 900 });
      } else {
        map.flyTo({
          center: [searchedLocation.coordinates.longitude, searchedLocation.coordinates.latitude],
          zoom: 14,
          duration: 900,
        });
      }
    } else {
      const source = map.getSource("proximity-line") as maplibregl.GeoJSONSource;
      source?.setData({ type: "FeatureCollection", features: [] });
    }
  }, [searchedLocation, selectedStation, walkingGeometry, mapLoaded]);

  // Synchronize Active Calculated Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    const source = map.getSource("active-route-line") as maplibregl.GeoJSONSource;
    if (!source) return;

    if (activeRoute) {
      const routeCoords: [number, number][] = [];

      for (const seg of activeRoute.segments) {
        if (seg.type === "first_mile_walk") {
          if (seg.walkingGeometry && seg.walkingGeometry.coordinates.length > 0) {
            for (const pt of seg.walkingGeometry.coordinates) {
              routeCoords.push(pt);
            }
          } else {
            routeCoords.push([seg.originCoordinates.longitude, seg.originCoordinates.latitude]);
            routeCoords.push([seg.targetStation.coordinates.longitude, seg.targetStation.coordinates.latitude]);
          }
        } else if (seg.type === "metro_ride") {
          for (const st of seg.stations) {
            routeCoords.push([st.coordinates.longitude, st.coordinates.latitude]);
          }
        } else if (seg.type === "last_mile_walk") {
          if (seg.walkingGeometry && seg.walkingGeometry.coordinates.length > 0) {
            for (const pt of seg.walkingGeometry.coordinates) {
              routeCoords.push(pt);
            }
          } else {
            routeCoords.push([seg.destinationCoordinates.longitude, seg.destinationCoordinates.latitude]);
          }
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

      if (routeCoords.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        for (const [lng, lat] of routeCoords) {
          bounds.extend([lng, lat]);
        }
        map.fitBounds(bounds, { padding: 90, duration: 1100, maxZoom: 15 });
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
      duration: 900,
    });
  };

  return (
    <div className="relative w-full h-full min-h-[350px] bg-[#05080E]">
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Network vs Street Mode Switcher (Top Left) */}
      <div className="absolute left-4 top-4 z-10 flex items-center bg-slate-950/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl">
        <button
          type="button"
          onClick={() => setMapMode("network")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mapMode === "network"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>NETWORK</span>
        </button>

        <button
          type="button"
          onClick={() => setMapMode("street")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mapMode === "street"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>STREET</span>
        </button>
      </div>

      {/* Compact Map Control Cluster (Top Right) */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-1.5 bg-slate-950/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-xl">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetKolkata}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors border-t border-slate-800"
          title="Reset to Kolkata View"
          aria-label="Reset View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowLayerMenu((prev) => !prev)}
          className={`p-2 rounded-lg transition-colors border-t border-slate-800 ${
            showLayerMenu ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          }`}
          title="Map Layers"
          aria-label="Map Layers"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Layers Menu Popover */}
      {showLayerMenu && (
        <div className="absolute right-4 top-44 z-10 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl text-xs space-y-2.5 w-48 text-slate-300">
          <div className="font-mono font-bold uppercase text-[10px] text-slate-400 tracking-wider">
            Transit Layers
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked readOnly className="accent-blue-500 rounded" />
            <span className="font-medium text-white">Metro Network</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showConstruction}
              onChange={(e) => setShowConstruction(e.target.checked)}
              className="accent-blue-500 rounded"
            />
            <span>Under Construction</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-500">
            <input
              type="checkbox"
              checked={showPlanned}
              onChange={(e) => setShowPlanned(e.target.checked)}
              disabled
              className="accent-blue-500 rounded opacity-50"
            />
            <span>Planned Alignment</span>
          </label>
        </div>
      )}

      {/* Signature Kolkata Transit Legend (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3.5 py-2.5 rounded-xl shadow-xl text-xs text-slate-300 space-y-2 hidden sm:block">
        <div className="flex items-center justify-between gap-4 font-mono font-bold text-[10px] uppercase tracking-wider text-slate-400">
          <span>KOLKATA METRO SYSTEM</span>
          <span className="text-emerald-400">● LIVE DATA</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0072CE]" />
            <span className="font-medium">Blue (L1)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A651]" />
            <span className="font-medium">Green (L2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#800080]" />
            <span className="font-medium">Purple (L3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF8000]" />
            <span className="font-medium">Orange (L6)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FCCC0A]" />
            <span className="font-medium">Yellow (L4)</span>
          </div>
        </div>

        <div className="pt-1.5 border-t border-slate-800/80 flex items-center gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">●</span> Normal Station
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">◎</span> Interchange Hub
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">○</span> Construction
          </div>
        </div>
      </div>
    </div>
  );
};
