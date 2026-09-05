import React from "react";
import { Clock, Route, Shuffle, ShieldCheck } from "lucide-react";
import { JourneyRoute } from "../../types/routing";
import { getLineById } from "../../data/lines";
import clsx from "clsx";

interface JourneySummaryCardProps {
  route: JourneyRoute;
}

export const JourneySummaryCard: React.FC<JourneySummaryCardProps> = ({ route }) => {
  return (
    <div className="bg-transit-card border border-transit-border rounded-xl p-4 space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-metro-green uppercase tracking-wider">
          Recommended Route
        </span>

        {/* Confidence Badge */}
        <span
          className={clsx(
            "text-[10px] px-2 py-0.5 rounded-full font-mono font-medium inline-flex items-center gap-1",
            route.confidence === "verified"
              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
              : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
          )}
        >
          {route.confidence === "verified" ? (
            <>
              <ShieldCheck className="w-3 h-3" />
              Verified Route
            </>
          ) : (
            "Dev Dataset"
          )}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-transit-border">
        {/* Total Est Duration */}
        <div className="p-2 rounded-lg bg-transit-bg border border-transit-border">
          <div className="flex items-center gap-1 text-[11px] text-transit-muted">
            <Clock className="w-3 h-3 text-metro-blue" />
            <span>Est. Time</span>
          </div>
          <div className="text-sm font-bold text-transit-text font-mono mt-0.5">
            ~{route.totalTravelMinutes} min
          </div>
        </div>

        {/* Stops */}
        <div className="p-2 rounded-lg bg-transit-bg border border-transit-border">
          <div className="flex items-center gap-1 text-[11px] text-transit-muted">
            <Route className="w-3 h-3 text-metro-green" />
            <span>Stops</span>
          </div>
          <div className="text-sm font-bold text-transit-text font-mono mt-0.5">
            {route.totalStops} {route.totalStops === 1 ? "stop" : "stops"}
          </div>
        </div>

        {/* Interchanges */}
        <div className="p-2 rounded-lg bg-transit-bg border border-transit-border">
          <div className="flex items-center gap-1 text-[11px] text-transit-muted">
            <Shuffle className="w-3 h-3 text-purple-400" />
            <span>Transfer</span>
          </div>
          <div className="text-sm font-bold text-transit-text font-mono mt-0.5">
            {route.interchangeCount === 0 ? "Direct" : `${route.interchangeCount} interchange`}
          </div>
        </div>
      </div>

      {/* Lines Used Chips */}
      <div className="flex items-center gap-2 pt-2 border-t border-transit-border">
        <span className="text-[11px] text-transit-muted">Lines:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {route.linesUsed.map((lineId) => {
            const line = getLineById(lineId);
            if (!line) return null;
            return (
              <span
                key={lineId}
                className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: `${line.color}15`,
                  color: line.color,
                  borderColor: `${line.color}40`,
                }}
              >
                {line.name} ({line.lineCode})
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
