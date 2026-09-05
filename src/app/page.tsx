"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Header, NavigationMode } from "../components/layout/Header";
import { SearchBar } from "../components/search/SearchBar";
import { NearestStationCard } from "../components/station/NearestStationCard";
import { NearbyStationsList } from "../components/station/NearbyStationsList";
import { JourneyPlannerForm } from "../components/journey/JourneyPlannerForm";
import { JourneySummaryCard } from "../components/journey/JourneySummaryCard";
import { RouteTimeline } from "../components/journey/RouteTimeline";
import { MobileDrawer } from "../components/layout/MobileDrawer";
import { useNearestMetro } from "../hooks/useNearestMetro";
import { useMetroRouter } from "../hooks/useMetroRouter";
import { KOLKATA_LANDMARKS } from "../data/landmarks";
import { GeocodingResult } from "../types/geo";
import { MetroStation } from "../types/station";
import { Compass, Navigation, Info } from "lucide-react";

// Dynamically import Map component to prevent SSR window issues with MapLibre GL
const MetroMap = dynamic(
  () => import("../components/map/MetroMap").then((mod) => mod.MetroMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] bg-transit-bg flex items-center justify-center text-xs text-transit-muted font-mono">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-metro-blue border-t-transparent rounded-full animate-spin" />
          <span>Initializing Kolkata Metro Map...</span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const [activeMode, setActiveMode] = useState<NavigationMode>("nearest");

  // Mode 1: Nearest Metro State Hook
  const {
    selectedLocation,
    selectedStation,
    recommendedStation,
    secondaryStations,
    isReranking,
    setLocation,
    selectStation,
  } = useNearestMetro();

  // Mode 2: Journey Planner State Hook
  const {
    origin,
    destination,
    route,
    setOrigin,
    setDestination,
    swapOriginDestination,
  } = useMetroRouter();

  // Handler to bridge Nearest Station -> Journey Planner
  const handlePlanFromStation = (station: MetroStation) => {
    const stationGeo: GeocodingResult = {
      id: `st_${station.id}`,
      name: `${station.name} Metro Station`,
      bengaliName: station.bengaliName,
      coordinates: station.coordinates,
      type: "station",
      source: "station",
    };
    setOrigin(stationGeo);
    setActiveMode("journey");
  };

  // Handler for quick presets in Journey Planner
  const handleQuickPreset = (originName: string, destName: string) => {
    const origLandmark = KOLKATA_LANDMARKS.find((l) => l.name === originName);
    const destLandmark = KOLKATA_LANDMARKS.find((l) => l.name === destName);

    if (origLandmark) setOrigin(origLandmark);
    if (destLandmark) setDestination(destLandmark);
  };

  // Station click from map
  const handleMapStationSelect = (station: MetroStation) => {
    selectStation(station);
  };

  // Render left panel navigation contents
  const renderSidebarContent = () => {
    if (activeMode === "nearest") {
      return (
        <div className="space-y-4">
          {/* Search Header */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-transit-text font-sans">
              Where are you headed?
            </h2>
            <p className="text-xs text-transit-muted">
              Enter any place or landmark in Kolkata to find the nearest metro station.
            </p>
          </div>

          {/* Primary Search Bar */}
          <SearchBar
            placeholder="e.g. Victoria Memorial, College Street, Sector V..."
            selectedLocation={selectedLocation}
            onLocationSelect={setLocation}
            autoFocus
          />

          {/* Nearest Results */}
          {recommendedStation ? (
            <div className="space-y-3 pt-2">
              {isReranking && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-300 font-mono animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full border border-blue-400 border-t-transparent animate-spin" />
                  <span>Calculating pedestrian walking access...</span>
                </div>
              )}

              <NearestStationCard
                result={recommendedStation}
                isSelected={selectedStation?.id === recommendedStation.station.id}
                onSelectStation={() => selectStation(recommendedStation.station)}
                onPlanFromStation={() => handlePlanFromStation(recommendedStation.station)}
              />

              {secondaryStations.length > 0 && (
                <NearbyStationsList
                  stations={secondaryStations}
                  selectedStationId={selectedStation?.id}
                  onSelectStation={selectStation}
                />
              )}
            </div>
          ) : (
            <div className="pt-6 text-center space-y-3 border-t border-transit-border">
              <div className="w-10 h-10 rounded-full bg-transit-card border border-transit-border flex items-center justify-center mx-auto text-transit-muted">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-transit-text">
                  Discover Nearest Metro Stations
                </p>
                <p className="text-[11px] text-transit-muted max-w-xs mx-auto">
                  Type a landmark above or click &quot;Use my location&quot; to find surrounding stations with walk distance estimates.
                </p>
              </div>

              {/* Sample landmark shortcuts */}
              <div className="pt-2">
                <p className="text-[10px] uppercase font-mono tracking-wider text-transit-muted mb-2">
                  Popular Landmarks
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {KOLKATA_LANDMARKS.slice(0, 4).map((lm) => (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => setLocation(lm)}
                      className="text-[11px] px-2.5 py-1 rounded bg-transit-card border border-transit-border hover:border-metro-blue/60 text-transit-muted hover:text-transit-text transition-colors"
                    >
                      {lm.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Active Mode: Journey Planner
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-transit-text font-sans">
            Plan Metro Journey
          </h2>
          <p className="text-xs text-transit-muted">
            Find the fastest route, line transfers, and walking legs between any two places.
          </p>
        </div>

        {/* Journey Form */}
        <JourneyPlannerForm
          origin={origin}
          destination={destination}
          onOriginSelect={setOrigin}
          onDestinationSelect={setDestination}
          onSwap={swapOriginDestination}
          onQuickPreset={handleQuickPreset}
        />

        {/* Calculated Journey Summary & Timeline */}
        {route ? (
          <div className="space-y-4 pt-1">
            <JourneySummaryCard route={route} />
            <RouteTimeline route={route} />
          </div>
        ) : origin && destination ? (
          <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>No direct or transfer route found between the selected locations on the current operational dataset.</span>
          </div>
        ) : (
          <div className="pt-6 text-center space-y-2 border-t border-transit-border">
            <div className="w-10 h-10 rounded-full bg-transit-card border border-transit-border flex items-center justify-center mx-auto text-transit-muted">
              <Navigation className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-transit-text">
              Select Origin and Destination
            </p>
            <p className="text-[11px] text-transit-muted max-w-xs mx-auto">
              Choose two landmarks or stations to compute the transit path, interchange nodes, and station stops.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-transit-bg text-transit-text">
      {/* Top Brand Header */}
      <Header activeMode={activeMode} onModeChange={setActiveMode} />

      {/* Main Split Layout Container */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Left 420px) */}
        <aside className="hidden lg:flex w-[430px] flex-col border-r border-transit-border bg-transit-bg z-20 overflow-y-auto p-5 shadow-xl">
          {renderSidebarContent()}
        </aside>

        {/* Map Canvas (Right / Full View) */}
        <main className="flex-1 relative h-full">
          <MetroMap
            selectedStation={selectedStation}
            searchedLocation={selectedLocation || origin || destination}
            activeRoute={route}
            onStationSelect={handleMapStationSelect}
            walkingGeometry={
              selectedStation
                ? [recommendedStation, ...secondaryStations].find(
                    (r) => r?.station.id === selectedStation.id
                  )?.walkingGeometry
                : null
            }
          />
        </main>

        {/* Mobile Bottom Sheet Drawer */}
        <MobileDrawer
          headerTitle={activeMode === "nearest" ? "Find Nearest Metro" : "Plan Metro Journey"}
        >
          {renderSidebarContent()}
        </MobileDrawer>
      </div>
    </div>
  );
}
