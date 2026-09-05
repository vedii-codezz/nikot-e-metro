import React from "react";
import { Train, Navigation, Footprints, ShieldCheck, ArrowRight } from "lucide-react";
import { NearbyStationResult } from "../../types/station";
import { getLineById } from "../../data/lines";
import { formatDistance } from "../../lib/geo/walking";
import clsx from "clsx";

interface NearestStationCardProps {
  result: NearbyStationResult;
  isSelected?: boolean;
  onSelectStation: () => void;
  onPlanFromStation: () => void;
}

export const NearestStationCard: React.FC<NearestStationCardProps> = ({
  result,
  isSelected = false,
  onSelectStation,
  onPlanFromStation,
}) => {
  const { station, distanceKm, estimatedWalkMinutes, confidence } = result;
  const primaryLine = getLineById(station.lineIds[0]);

  return (
    <div
      onClick={onSelectStation}
      className={clsx(
        "cursor-pointer rounded-xl p-4 transition-all border",
        isSelected
          ? "bg-transit-cardHover border-metro-blue shadow-md"
          : "bg-transit-card border-transit-border hover:border-transit-borderLight"
      )}
    >
      {/* Recommended header label */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-metro-blue uppercase tracking-wider">
          <Train className="w-3.5 h-3.5" />
          <span>Recommended Nearest Metro</span>
        </div>

        {/* Confidence badge */}
        <span
          className={clsx(
            "text-[10px] px-2 py-0.5 rounded-full font-mono font-medium inline-flex items-center gap-1",
            confidence === "verified"
              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
              : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
          )}
        >
          {confidence === "verified" ? (
            <>
              <ShieldCheck className="w-3 h-3" />
              Verified Data
            </>
          ) : (
            "Dev Dataset"
          )}
        </span>
      </div>

      {/* Station Name & Bengali */}
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-transit-text tracking-tight font-sans">
            {station.name}
          </h3>
          {station.bengaliName && (
            <p className="text-xs text-transit-muted font-sans mt-0.5">
              {station.bengaliName}
            </p>
          )}
        </div>

        {/* Line Badge */}
        {primaryLine && (
          <div
            className="px-2.5 py-1 rounded text-xs font-semibold shrink-0"
            style={{
              backgroundColor: `${primaryLine.color}20`,
              color: primaryLine.color,
              borderColor: `${primaryLine.color}40`,
              borderWidth: 1,
            }}
          >
            {primaryLine.name} ({primaryLine.lineCode})
          </div>
        )}
      </div>

      {/* Distance and Walk Estimate */}
      <div className="mt-3 pt-3 border-t border-transit-border flex items-center justify-between text-xs text-transit-muted">
        <div className="flex items-center gap-1.5 text-transit-text font-medium font-mono">
          <Footprints className="w-3.5 h-3.5 text-metro-blue" />
          <span>
            {result.walkingRouteQuality === "routed" && result.walkingDistanceMeters
              ? `${formatDistance(result.walkingDistanceMeters / 1000)} walk`
              : `Approx. ${formatDistance(distanceKm)} away`}
          </span>
        </div>

        <span className="text-[11px] text-transit-muted">
          {result.walkingRouteQuality === "routed" && result.walkingDurationSeconds
            ? `${Math.max(1, Math.round(result.walkingDurationSeconds / 60))} min`
            : `~${estimatedWalkMinutes} min walk est.`}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3.5 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlanFromStation();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-metro-blue/20 hover:bg-metro-blue/30 text-metro-blue hover:text-blue-300 text-xs font-medium border border-metro-blue/40 transition-colors"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Plan Journey From Here</span>
          <ArrowRight className="w-3 h-3 ml-auto" />
        </button>
      </div>
    </div>
  );
};
