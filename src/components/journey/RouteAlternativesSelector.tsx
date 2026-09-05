"use client";

import React from "react";
import { MultimodalJourneyCandidate, RoutingOptimizationPreference } from "../../types/multimodal";
import { Clock, Footprints, ArrowLeftRight, Sparkles, Zap, Shield, ChevronRight } from "lucide-react";

interface RouteAlternativesSelectorProps {
  currentPreference: RoutingOptimizationPreference;
  onSelectPreference: (pref: RoutingOptimizationPreference) => void;
  candidates: MultimodalJourneyCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: MultimodalJourneyCandidate) => void;
}

export const RouteAlternativesSelector: React.FC<RouteAlternativesSelectorProps> = ({
  currentPreference,
  onSelectPreference,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}) => {
  const preferences: { id: RoutingOptimizationPreference; label: string; icon: any }[] = [
    { id: "recommended", label: "Recommended", icon: Sparkles },
    { id: "fastest", label: "Fastest", icon: Zap },
    { id: "least_walking", label: "Least Walking", icon: Footprints },
    { id: "fewest_interchanges", label: "Fewest Changes", icon: ArrowLeftRight },
  ];

  // Benchmark reference is the first candidate (usually recommended)
  const baselineCandidate = candidates[0];

  return (
    <div className="space-y-3.5">
      {/* Optimization Preference Pills */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
        {preferences.map((p) => {
          const Icon = p.icon;
          const isActive = currentPreference === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreference(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Multimodal Alternative Journey Cards */}
      {candidates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              YOUR JOURNEY OPTIONS ({candidates.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Distinct Corridors
            </span>
          </div>

          <div className="grid gap-2">
            {candidates.map((cand, idx) => {
              const isSelected =
                selectedCandidateId === cand.id || (!selectedCandidateId && idx === 0);
              const durationMins = Math.round(cand.totalActualDurationSeconds / 60);
              const walkMeters = Math.round(cand.totalWalkingMeters);

              // Calculate difference relative to recommended baseline
              let deltaNote = "";
              if (idx > 0 && baselineCandidate) {
                const baseMins = Math.round(baselineCandidate.totalActualDurationSeconds / 60);
                const baseWalk = Math.round(baselineCandidate.totalWalkingMeters);
                const diffMins = durationMins - baseMins;
                const diffWalk = walkMeters - baseWalk;

                const parts: string[] = [];
                if (diffMins > 0) parts.push(`+${diffMins} min`);
                else if (diffMins < 0) parts.push(`${diffMins} min`);

                if (diffWalk < -50) parts.push(`${diffWalk} m walk`);
                else if (diffWalk > 50) parts.push(`+${diffWalk} m walk`);

                if (cand.metroInterchangeCount < baselineCandidate.metroInterchangeCount) {
                  parts.push("1 fewer change");
                }

                deltaNote = parts.join(" · ");
              } else if (idx === 0) {
                deltaNote = "Optimal balance of transit time & transfer comfort";
              }

              return (
                <button
                  key={cand.id}
                  onClick={() => onSelectCandidate(cand)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all relative ${
                    isSelected
                      ? "bg-slate-800/95 border-blue-500 shadow-lg ring-1 ring-blue-500/40"
                      : "bg-slate-900/70 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                          idx === 0
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : isSelected
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {idx === 0 ? "BEST / METRO" : cand.explanation?.tag || `Option ${idx + 1}`}
                      </span>

                      {isSelected && (
                        <span className="text-[10px] text-blue-400 font-mono font-bold">
                          ● SELECTED
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-bold text-white font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>{durationMins} MIN</span>
                    </div>
                  </div>

                  {/* Supporting Route Metrics */}
                  <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-emerald-400" />
                      <span>{walkMeters} m walk</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                      <span>
                        {cand.metroInterchangeCount === 0
                          ? "Direct Line"
                          : `${cand.metroInterchangeCount} ${cand.metroInterchangeCount === 1 ? "change" : "changes"}`}
                      </span>
                    </span>
                  </div>

                  {/* Delta / Tradeoff Explanation */}
                  {deltaNote && (
                    <div className="mt-2 text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{deltaNote}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
