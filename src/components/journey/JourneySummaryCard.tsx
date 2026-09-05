import React from "react";
import { JourneyRoute } from "../../types/routing";
import { getLineById } from "../../data/lines";
import { formatDistance } from "../../lib/geo/walking";
import { Clock, Route, ArrowLeftRight, Footprints, ShieldCheck } from "lucide-react";

interface JourneySummaryCardProps {
  route: JourneyRoute;
}

export const JourneySummaryCard: React.FC<JourneySummaryCardProps> = ({ route }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {/* Top Tag & Verification */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono tracking-wider text-emerald-400 font-bold uppercase bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
          RECOMMENDED JOURNEY
        </span>

        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Operational Transit</span>
        </span>
      </div>

      {/* Dominant Display Metric */}
      <div className="flex items-baseline justify-between pt-1">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-white tracking-tight font-mono">
              {route.totalTravelMinutes}
            </span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">
              MIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Total door-to-door transit time
          </p>
        </div>

        {/* Lines Sequence Flow */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[200px]">
          {route.linesUsed.map((lineId, idx) => {
            const line = getLineById(lineId);
            if (!line) return null;
            return (
              <React.Fragment key={lineId}>
                {idx > 0 && <span className="text-slate-600 text-xs font-mono">→</span>}
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1"
                  style={{
                    backgroundColor: `${line.color}15`,
                    borderColor: `${line.color}40`,
                    color: line.color,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <span>{line.name.replace(" Line", "")}</span>
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Supporting Metric Tokens */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-mono">
            <Route className="w-3 h-3 text-blue-400" />
            <span>Stops</span>
          </div>
          <div className="text-sm font-bold text-white font-mono mt-1">
            {route.totalStops} {route.totalStops === 1 ? "station" : "stations"}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-mono">
            <ArrowLeftRight className="w-3 h-3 text-purple-400" />
            <span>Transfers</span>
          </div>
          <div className="text-sm font-bold text-white font-mono mt-1">
            {route.interchangeCount === 0 ? "Direct" : `${route.interchangeCount} change`}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider font-mono">
            <Footprints className="w-3 h-3 text-emerald-400" />
            <span>Walking</span>
          </div>
          <div className="text-sm font-bold text-white font-mono mt-1">
            ~{formatDistance(route.totalDistanceKm > 0.5 ? 0.6 : 0.2)}
          </div>
        </div>
      </div>
    </div>
  );
};
