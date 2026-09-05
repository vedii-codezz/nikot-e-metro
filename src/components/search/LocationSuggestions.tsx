import React from "react";
import { Landmark, Train, GraduationCap, Hospital, MapPin, Navigation } from "lucide-react";
import { GeocodingResult, LocationType } from "../../types/geo";
import clsx from "clsx";

interface LocationSuggestionsProps {
  suggestions: GeocodingResult[];
  activeIndex: number;
  onSelect: (item: GeocodingResult) => void;
  isLoading?: boolean;
}

function getLocationIcon(type: LocationType) {
  switch (type) {
    case "station":
      return <Train className="w-4 h-4 text-metro-blue" />;
    case "landmark":
      return <Landmark className="w-4 h-4 text-metro-orange" />;
    case "educational":
      return <GraduationCap className="w-4 h-4 text-purple-400" />;
    case "hospital":
      return <Hospital className="w-4 h-4 text-rose-400" />;
    case "transit_hub":
      return <Navigation className="w-4 h-4 text-emerald-400" />;
    default:
      return <MapPin className="w-4 h-4 text-transit-muted" />;
  }
}

export const LocationSuggestions: React.FC<LocationSuggestionsProps> = ({
  suggestions,
  activeIndex,
  onSelect,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="p-3 text-xs text-transit-muted flex items-center gap-2 bg-transit-card border border-transit-border rounded-lg shadow-lg">
        <div className="w-3.5 h-3.5 border-2 border-metro-blue border-t-transparent rounded-full animate-spin" />
        Searching locations...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <ul
      role="listbox"
      className="absolute top-full left-0 right-0 mt-1.5 bg-transit-card border border-transit-border rounded-lg shadow-xl overflow-hidden z-50 divide-y divide-transit-border max-h-72 overflow-y-auto"
    >
      {suggestions.map((item, index) => (
        <li
          key={item.id}
          role="option"
          aria-selected={index === activeIndex}
          onClick={() => onSelect(item)}
          className={clsx(
            "p-3 cursor-pointer transition-colors flex items-start gap-3 text-left",
            index === activeIndex
              ? "bg-transit-cardHover text-transit-text"
              : "hover:bg-transit-cardHover/60 text-transit-text"
          )}
        >
          <div className="mt-0.5 p-1.5 rounded bg-transit-bg border border-transit-border">
            {getLocationIcon(item.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-sm text-transit-text truncate">
                {item.name}
              </span>
              {item.bengaliName && (
                <span className="text-xs text-transit-muted truncate">
                  {item.bengaliName}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-[11px] text-transit-muted truncate mt-0.5">
                {item.description}
              </p>
            )}
          </div>
          {item.source === "curated" && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-transit-border text-transit-muted self-center">
              Curated
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};
