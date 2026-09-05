import React, { useState, useEffect, useRef } from "react";
import { Search, X, Crosshair, AlertCircle } from "lucide-react";
import { GeocodingResult } from "../../types/geo";
import { geocodingService } from "../../lib/geocoding/geocoder";
import { LocationSuggestions } from "./LocationSuggestions";
import { useGeolocation } from "../../hooks/useGeolocation";
import clsx from "clsx";

interface SearchBarProps {
  placeholder?: string;
  selectedLocation: GeocodingResult | null;
  onLocationSelect: (location: GeocodingResult | null) => void;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search a place, landmark, or destination...",
  selectedLocation,
  onLocationSelect,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState(selectedLocation ? selectedLocation.name : "");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    status: geoStatus,
    coordinates: geoCoords,
    errorMessage: geoError,
    requestLocation,
    simulateKolkataLocation,
  } = useGeolocation();

  // Sync internal query when selectedLocation prop changes from outside
  useEffect(() => {
    if (selectedLocation) {
      setQuery(selectedLocation.name);
    } else {
      setQuery("");
    }
  }, [selectedLocation]);

  // Handle geolocation updates
  useEffect(() => {
    if (geoStatus === "success" && geoCoords) {
      const geoResult: GeocodingResult = {
        id: `gps_${Date.now()}`,
        name: "My Current Location",
        coordinates: geoCoords,
        type: "custom",
        description: `${geoCoords.latitude.toFixed(4)}° N, ${geoCoords.longitude.toFixed(4)}° E`,
        source: "gps",
      };
      onLocationSelect(geoResult);
      setIsOpen(false);
    }
  }, [geoStatus, geoCoords, onLocationSelect]);

  // Handle debounced search via backend GET /api/search with fallback
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (selectedLocation && query === selectedLocation.name) {
      return; // Do not search if query matches active selection
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`);
        if (!res.ok) throw new Error("Search API error");
        const json = await res.json();
        const results: GeocodingResult[] = json.data?.results || [];
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setActiveIndex(-1);
      } catch {
        // Fallback to local client geocoding service
        try {
          const fallbackResults = await geocodingService.search(query);
          setSuggestions(fallbackResults);
          setIsOpen(fallbackResults.length > 0);
          setActiveIndex(-1);
        } catch {
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, selectedLocation]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: GeocodingResult) => {
    setQuery(item.name);
    setIsOpen(false);
    onLocationSelect(item);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    onLocationSelect(null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Container */}
      <div className="relative flex items-center bg-transit-card border border-transit-border focus-within:border-metro-blue focus-within:ring-1 focus-within:ring-metro-blue rounded-lg shadow-sm transition-all">
        <Search className="w-4 h-4 ml-3.5 text-transit-muted pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 && query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-transit-text placeholder:text-transit-muted focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 mr-1 text-transit-muted hover:text-transit-text rounded"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* "Use My Location" Quick Action */}
      {!selectedLocation && !query && (
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={requestLocation}
            disabled={geoStatus === "requesting"}
            className={clsx(
              "flex items-center gap-1.5 text-xs text-metro-blue hover:text-blue-400 font-medium py-1 px-2 rounded hover:bg-metro-blue/10 transition-colors",
              geoStatus === "requesting" && "opacity-60 cursor-not-allowed"
            )}
          >
            <Crosshair className={clsx("w-3.5 h-3.5", geoStatus === "requesting" && "animate-spin")} />
            <span>{geoStatus === "requesting" ? "Detecting location..." : "Use my location"}</span>
          </button>

          {geoStatus === "denied" && (
            <button
              type="button"
              onClick={simulateKolkataLocation}
              className="text-[11px] text-transit-muted hover:text-transit-text underline"
            >
              Test with Kolkata Central
            </button>
          )}
        </div>
      )}

      {/* Geolocation Error Alert */}
      {geoError && (
        <div className="mt-2 p-2 rounded bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span>{geoError}</span>
            {geoStatus === "denied" && (
              <button
                type="button"
                onClick={simulateKolkataLocation}
                className="ml-2 underline font-medium text-amber-200 hover:text-white"
              >
                Use Kolkata reference coordinates
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auto-suggest dropdown */}
      {isOpen && (
        <LocationSuggestions
          suggestions={suggestions}
          activeIndex={activeIndex}
          onSelect={handleSelect}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};
