"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Header, NavigationMode } from "../components/layout/Header";
import { SearchBar } from "../components/search/SearchBar";
import { NearestStationCard } from "../components/station/NearestStationCard";
import { NearbyStationsList } from "../components/station/NearbyStationsList";
import { StationInspector } from "../components/station/StationInspector";
import { JourneyPlannerForm } from "../components/journey/JourneyPlannerForm";
import { JourneySummaryCard } from "../components/journey/JourneySummaryCard";
import { RouteTimeline } from "../components/journey/RouteTimeline";
import { MobileDrawer } from "../components/layout/MobileDrawer";
import { useNearestMetro } from "../hooks/useNearestMetro";
import { useMetroRouter } from "../hooks/useMetroRouter";
import { KOLKATA_LANDMARKS } from "../data/landmarks";
import { GeocodingResult } from "../types/geo";
import { MetroStation } from "../types/station";
import { RouteAlternativesSelector } from "../components/journey/RouteAlternativesSelector";
import { RideHailCard } from "../components/journey/RideHailCard";
import { Compass, Navigation, AlertCircle, ArrowRight } from "lucide-react";
import clsx from "clsx";

// Dynamically import Map component to prevent SSR window issues with MapLibre GL
const MetroMap = dynamic(
  () => import("../components/map/MetroMap").then((mod) => mod.MetroMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] bg-[#05080E] flex items-center justify-center text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>INITIALIZING KOLKATA METRO CARTOGRAPHY...</span>
        </div>
      </div>
    ),
  }
);

export default function Home() {
  const [activeMode, setActiveMode] = useState<NavigationMode>("nearest");
  const [inspectedStation, setInspectedStation] = useState<MetroStation | null>(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number | null>(null);

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
    candidates,
    selectedCandidate,
    preference,
    rideHail,
    setOrigin,
    setDestination,
    setPreference,
    selectCandidate,
    swapOriginDestination,
  } = useMetroRouter();

  // Handler to bridge Station -> Origin
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
    setInspectedStation(null);
  };

  // Handler to bridge Station -> Destination
  const handlePlanToStation = (station: MetroStation) => {
    const stationGeo: GeocodingResult = {
      id: `st_${station.id}`,
      name: `${station.name} Metro Station`,
      bengaliName: station.bengaliName,
      coordinates: station.coordinates,
      type: "station",
      source: "station",
    };
    setDestination(stationGeo);
    setActiveMode("journey");
    setInspectedStation(null);
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
    setInspectedStation(station);
  };

  // Render left panel navigation contents
  const renderSidebarContent = () => {
    // If a station is actively inspected, display the Station Inspector contextually
    if (inspectedStation) {
      return (
        <div className="space-y-4">
          <StationInspector
            station={inspectedStation}
            onClose={() => setInspectedStation(null)}
            onSetOrigin={handlePlanFromStation}
            onSetDestination={handlePlanToStation}
          />
        </div>
      );
    }

    if (activeMode === "nearest") {
      return (
        <div className="space-y-5">
          {/* Editorial Search Header */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold">
              NEAREST METRO DISCOVERY
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white font-sans">
              Where are you in Kolkata?
            </h2>
            <p className="text-xs text-slate-400">
              Enter any landmark, railway station, or street to find pedestrian-routed metro access.
            </p>
          </div>

          {/* Primary Search Bar */}
          <SearchBar
            placeholder="e.g. Victoria Memorial, Howrah Station, Science City..."
            selectedLocation={selectedLocation}
            onLocationSelect={(loc) => {
              setLocation(loc);
              setInspectedStation(null);
            }}
            autoFocus
          />

          {/* Nearest Results */}
          {recommendedStation ? (
            <div className="space-y-3 pt-2">
              {isReranking && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-300 font-mono animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full border border-blue-400 border-t-transparent animate-spin" />
                  <span>Calculating real pedestrian street routing...</span>
                </div>
              )}

              <NearestStationCard
                result={recommendedStation}
                isSelected={selectedStation?.id === recommendedStation.station.id}
                onSelectStation={() => {
                  selectStation(recommendedStation.station);
                  setInspectedStation(recommendedStation.station);
                }}
                onPlanFromStation={() => handlePlanFromStation(recommendedStation.station)}
              />

              {secondaryStations.length > 0 && (
                <NearbyStationsList
                  stations={secondaryStations}
                  selectedStationId={selectedStation?.id}
                  onSelectStation={(st) => {
                    selectStation(st);
                    setInspectedStation(st);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="pt-8 text-center space-y-3 border-t border-slate-800/80">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-blue-400 shadow-md">
                <Compass className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  KOLKATA MOVES DIFFERENTLY
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Find the nearest Metro. Plan across lines. Connect the last mile.
                </p>
              </div>

              {/* Sample landmark shortcuts */}
              <div className="pt-3">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 font-semibold">
                  Popular Kolkata Landmarks
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {KOLKATA_LANDMARKS.slice(0, 5).map((lm) => (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => setLocation(lm)}
                      className="text-xs px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/60 text-slate-300 hover:text-white transition-all active:scale-[0.98]"
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
          <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold">
            DOOR-TO-DOOR TRANSIT
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white font-sans">
            Plan Metro Journey
          </h2>
          <p className="text-xs text-slate-400">
            Intelligent routing across Blue, Green, Purple, Orange & Yellow lines.
          </p>
        </div>

        {/* Journey Form */}
        <JourneyPlannerForm
          origin={origin}
          destination={destination}
          onOriginSelect={(loc) => {
            setOrigin(loc);
            setInspectedStation(null);
          }}
          onDestinationSelect={(loc) => {
            setDestination(loc);
            setInspectedStation(null);
          }}
          onSwap={swapOriginDestination}
          onQuickPreset={handleQuickPreset}
        />

        {/* Route Alternatives & Optimization Preference Selector */}
        {(candidates.length > 0 || (origin && destination)) && (
          <RouteAlternativesSelector
            currentPreference={preference}
            onSelectPreference={setPreference}
            candidates={candidates}
            selectedCandidateId={selectedCandidate?.id || null}
            onSelectCandidate={selectCandidate}
          />
        )}

        {/* Calculated Journey Summary & Timeline */}
        {route ? (
          <div className="space-y-4 pt-1">
            <JourneySummaryCard route={route} />
            <RouteTimeline
              route={route}
              onSelectSegment={(idx) => setSelectedSegmentIndex(idx)}
            />
            {rideHail && <RideHailCard rideHail={rideHail} />}
          </div>
        ) : origin && destination ? (
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">NO PRACTICAL ROUTE FOUND</strong>
              <span>
                We couldn&apos;t connect these locations using the currently operational network. Try searching for another nearby station or landmark.
              </span>
            </div>
          </div>
        ) : (
          <div className="pt-8 text-center space-y-2 border-t border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400 shadow-md">
              <Navigation className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Select Origin & Destination
            </p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Choose two points to calculate multi-line transit paths, verified interchanges, and pedestrian legs.
            </p>
          </div>
        )}
      </div>
    );
  };

  const isJourneyActive = !!route;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#05080E] text-slate-100 font-sans">
      {/* Top Brand Header */}
      <Header activeMode={activeMode} onModeChange={setActiveMode} />

      {/* Main Responsive Split Layout */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Desktop Sidebar: 34% Discovery Mode -> 42% Journey Mode */}
        <aside
          className={clsx(
            "hidden lg:flex flex-col border-r border-slate-800 bg-slate-950 z-20 overflow-y-auto p-5 shadow-2xl transition-all duration-300 ease-in-out",
            isJourneyActive ? "w-[42%] max-w-[560px]" : "w-[34%] max-w-[460px]"
          )}
        >
          {renderSidebarContent()}
        </aside>

        {/* Map Canvas */}
        <main className="flex-1 relative h-full">
          <MetroMap
            selectedStation={selectedStation}
            searchedLocation={selectedLocation || origin || destination}
            activeRoute={route}
            selectedSegmentIndex={selectedSegmentIndex}
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

        {/* Mobile 3-Tier Bottom Sheet */}
        <MobileDrawer
          headerTitle={
            activeMode === "nearest"
              ? "Find Nearest Metro"
              : route
              ? `${route.totalTravelMinutes} MIN · ${route.linesUsed.map((l) => l.toUpperCase()).join(" → ")}`
              : "Plan Metro Journey"
          }
          peekSubtitle={
            route
              ? `${route.totalStops} stops · ${route.interchangeCount} transfer`
              : undefined
          }
        >
          {renderSidebarContent()}
        </MobileDrawer>
      </div>
    </div>
  );
}
