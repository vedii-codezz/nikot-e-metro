"use client";

import React from "react";
import { MultimodalJourneyCandidate, RoutingOptimizationPreference } from "../../types/multimodal";
import { Clock, Footprints, ArrowLeftRight, Sparkles, Zap, Shield } from "lucide-react";

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

  return (
    <div className="space-y-4">
      {/* Optimization Preference Filters */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
        {preferences.map((p) => {
          const Icon = p.icon;
          const isActive = currentPreference === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreference(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
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

      {/* Alternative Journey Candidates */}
      {candidates.length > 1 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Route Alternatives ({candidates.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Deduplicated corridors</span>
          </div>

          <div className="grid gap-2">
            {candidates.map((cand, idx) => {
              const isSelected = selectedCandidateId === cand.id || (!selectedCandidateId && idx === 0);
              const durationMins = Math.round(cand.totalActualDurationSeconds / 60);
              const walkMeters = Math.round(cand.totalWalkingMeters);

              return (
                <button
                  key={cand.id}
                  onClick={() => onSelectCandidate(cand)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-slate-800/90 border-blue-500/80 shadow-lg ring-1 ring-blue-500/30"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {cand.explanation?.tag || `Option ${idx + 1}`}
                    </span>
                    <span className="text-sm font-bold text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      {durationMins} min
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Footprints className="w-3 h-3 text-emerald-400" />
                      {walkMeters} m walk
                    </span>
                    <span className="flex items-center gap-1">
                      <ArrowLeftRight className="w-3 h-3 text-amber-400" />
                      {cand.metroInterchangeCount === 0
                        ? "Direct"
                        : `${cand.metroInterchangeCount} transfer`}
                    </span>
                  </div>

                  {cand.explanation?.description && (
                    <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
                      {cand.explanation.description}
                    </p>
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
