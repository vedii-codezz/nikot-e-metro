import React from "react";
import { ArrowUpDown, MapPin, Navigation } from "lucide-react";
import { GeocodingResult } from "../../types/geo";
import { SearchBar } from "../search/SearchBar";

interface JourneyPlannerFormProps {
  origin: GeocodingResult | null;
  destination: GeocodingResult | null;
  onOriginSelect: (location: GeocodingResult | null) => void;
  onDestinationSelect: (location: GeocodingResult | null) => void;
  onSwap: () => void;
  onQuickPreset: (originName: string, destName: string) => void;
}

const PRESETS = [
  {
    label: "Techno India → Victoria Memorial",
    origin: "Techno India University",
    destination: "Victoria Memorial",
  },
  {
    label: "Howrah Station → Sector V",
    origin: "Howrah Railway Station",
    destination: "Salt Lake Sector V (IT Hub)",
  },
  {
    label: "Dakshineswar → Kalighat Temple",
    origin: "Dakshineswar Kali Temple",
    destination: "Kalighat Kali Temple",
  },
];

export const JourneyPlannerForm: React.FC<JourneyPlannerFormProps> = ({
  origin,
  destination,
  onOriginSelect,
  onDestinationSelect,
  onSwap,
  onQuickPreset,
}) => {
  return (
    <div className="space-y-3">
      {/* Origin & Destination Inputs */}
      <div className="relative space-y-2 bg-transit-card/50 p-3 rounded-xl border border-transit-border">
        {/* Origin */}
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-metro-blue uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-metro-blue inline-block" />
            <span>Origin Place / Landmark</span>
          </div>
          <SearchBar
            placeholder="Enter starting location or landmark..."
            selectedLocation={origin}
            onLocationSelect={onOriginSelect}
          />
        </div>

        {/* Swap Button Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-transit-border" />
          </div>
          <button
            type="button"
            onClick={onSwap}
            disabled={!origin && !destination}
            className="relative z-10 p-1.5 rounded-full bg-transit-card border border-transit-border hover:border-metro-blue text-transit-muted hover:text-metro-blue transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Swap Origin and Destination"
            aria-label="Swap Origin and Destination"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Destination */}
        <div className="relative">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <MapPin className="w-3 h-3 text-rose-400" />
            <span>Destination Place / Landmark</span>
          </div>
          <SearchBar
            placeholder="Enter destination location or landmark..."
            selectedLocation={destination}
            onLocationSelect={onDestinationSelect}
          />
        </div>
      </div>

      {/* Quick Example Presets for Instant Testing */}
      {(!origin || !destination) && (
        <div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-transit-muted mb-1.5 px-1">
            <Navigation className="w-3 h-3" />
            <span>Sample Kolkata Journeys:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onQuickPreset(p.origin, p.destination)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-transit-card border border-transit-border hover:border-transit-borderLight hover:text-transit-text text-transit-muted transition-colors text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
