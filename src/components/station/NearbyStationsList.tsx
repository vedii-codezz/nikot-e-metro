import React from "react";
import { Train, Footprints } from "lucide-react";
import { NearbyStationResult, MetroStation } from "../../types/station";
import { getLineById } from "../../data/lines";
import { formatDistance } from "../../lib/geo/walking";
import clsx from "clsx";

interface NearbyStationsListProps {
  stations: NearbyStationResult[];
  selectedStationId?: string;
  onSelectStation: (station: MetroStation) => void;
}

export const NearbyStationsList: React.FC<NearbyStationsListProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
}) => {
  if (stations.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-transit-muted mb-2 px-1">
        Other Nearby Stations
      </h4>

      <div className="space-y-2">
        {stations.map((res) => {
          const { station, distanceKm, estimatedWalkMinutes } = res;
          const isSelected = selectedStationId === station.id;
          const line = getLineById(station.lineIds[0]);

          return (
            <div
              key={station.id}
              onClick={() => onSelectStation(station)}
              className={clsx(
                "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3",
                isSelected
                  ? "bg-transit-cardHover border-metro-blue shadow-sm"
                  : "bg-transit-card border-transit-border hover:border-transit-borderLight"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded bg-transit-bg border border-transit-border text-transit-muted">
                  <Train className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-transit-text truncate">
                      {station.name}
                    </span>
                    {station.bengaliName && (
                      <span className="text-[11px] text-transit-muted truncate">
                        {station.bengaliName}
                      </span>
                    )}
                  </div>
                  {line && (
                    <span
                      className="text-[10px] font-medium"
                      style={{ color: line.color }}
                    >
                      {line.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1 text-xs font-mono font-medium text-transit-text">
                  <Footprints className="w-3 h-3 text-transit-muted" />
                  <span>
                    {res.walkingRouteQuality === "routed" && res.walkingDistanceMeters
                      ? `${formatDistance(res.walkingDistanceMeters / 1000)} walk`
                      : formatDistance(distanceKm)}
                  </span>
                </div>
                <div className="text-[10px] text-transit-muted">
                  {res.walkingRouteQuality === "routed" && res.walkingDurationSeconds
                    ? `${Math.max(1, Math.round(res.walkingDurationSeconds / 60))} min`
                    : `~${estimatedWalkMinutes} min walk est.`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
