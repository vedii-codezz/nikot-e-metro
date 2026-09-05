import React, { useState } from "react";
import {
  JourneyRoute,
  RouteSegment,
  MetroRideSegment,
  InterchangeSegment,
  FirstMileWalkSegment,
  LastMileWalkSegment,
} from "../../types/routing";
import { getLineById } from "../../data/lines";
import { formatDistance } from "../../lib/geo/walking";
import {
  Footprints,
  Train,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  CircleDot,
  ArrowDown,
} from "lucide-react";

interface RouteTimelineProps {
  route: JourneyRoute;
  onSelectSegment?: (segmentIndex: number) => void;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  route,
  onSelectSegment,
}) => {
  const [expandedSegments, setExpandedSegments] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSegments((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          Action Timeline & Itinerary
        </h4>
        <span className="text-[10px] text-slate-400 font-mono">
          Click step to inspect
        </span>
      </div>

      <div className="relative pl-7 space-y-4 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {route.segments.map((segment, index) => (
          <div
            key={index}
            onClick={() => onSelectSegment?.(index)}
            className="relative cursor-pointer group"
          >
            {renderSegment(
              segment,
              index,
              expandedSegments[index] || false,
              (e) => toggleExpand(index, e)
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function renderSegment(
  segment: RouteSegment,
  index: number,
  isExpanded: boolean,
  onToggleExpand: (e: React.MouseEvent) => void
) {
  switch (segment.type) {
    case "first_mile_walk":
      return renderFirstMile(segment);
    case "metro_ride":
      return renderMetroRide(segment, isExpanded, onToggleExpand);
    case "interchange":
      return renderInterchange(segment);
    case "last_mile_walk":
      return renderLastMile(segment);
  }
}

function renderFirstMile(segment: FirstMileWalkSegment) {
  return (
    <div>
      {/* Origin Bullet */}
      <div className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-blue-500 flex items-center justify-center shadow-md">
        <div className="w-2 h-2 rounded-full bg-blue-500" />
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 transition-colors group-hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-blue-400">
            START / FIRST MILE
          </span>
          <span className="text-xs font-mono text-slate-400">
            ~{segment.estimatedWalkMinutes} min
          </span>
        </div>

        <div className="text-sm font-bold text-white">
          {segment.originName}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <Footprints className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            Walk {formatDistance(segment.distanceKm)} to{" "}
            <strong className="text-slate-200">{segment.targetStation.name}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function renderMetroRide(
  segment: MetroRideSegment,
  isExpanded: boolean,
  onToggleExpand: (e: React.MouseEvent) => void
) {
  const line = getLineById(segment.lineId);
  const intermediateStations = segment.stations.slice(1, -1);

  return (
    <div>
      {/* Ride Line Bullet */}
      <div
        className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-md"
        style={{ borderColor: line?.color || "#0072CE" }}
      >
        <Train className="w-3 h-3" style={{ color: line?.color || "#0072CE" }} />
      </div>

      <div
        className="bg-slate-900/90 border rounded-xl p-3.5 space-y-2.5 transition-colors"
        style={{ borderColor: `${line?.color || "#0072CE"}40` }}
      >
        {/* Line & Board Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded border"
              style={{
                backgroundColor: `${line?.color || "#0072CE"}20`,
                borderColor: `${line?.color || "#0072CE"}50`,
                color: line?.color || "#0072CE",
              }}
            >
              BOARD {line?.name.toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-white">
            {segment.travelMinutes} min
          </span>
        </div>

        {/* Boarding and Alighting Points */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-mono text-slate-400">At:</span>
            <span className="text-sm font-bold text-white">{segment.fromStation.name}</span>
            {segment.fromStation.bengaliName && (
              <span className="text-xs text-emerald-400">{segment.fromStation.bengaliName}</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-mono text-slate-400">To:</span>
            <span className="text-sm font-bold text-white">{segment.toStation.name}</span>
            {segment.toStation.bengaliName && (
              <span className="text-xs text-emerald-400">{segment.toStation.bengaliName}</span>
            )}
          </div>
        </div>

        {/* Collapsible Intermediate Stations Section */}
        {intermediateStations.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors"
            >
              <span className="font-mono">
                {segment.stopCount} {segment.stopCount === 1 ? "stop" : "stops"} (
                {isExpanded ? "Hide intermediate" : "Show intermediate stations"})
              </span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-2 pl-4 border-l-2 border-dashed border-slate-800 space-y-1.5 py-1">
                {intermediateStations.map((st) => (
                  <div key={st.id} className="flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>{st.name}</span>
                    </div>
                    {st.bengaliName && (
                      <span className="text-[11px] text-slate-400">{st.bengaliName}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderInterchange(segment: InterchangeSegment) {
  const fromLine = getLineById(segment.fromLineId);
  const toLine = getLineById(segment.toLineId);

  return (
    <div>
      {/* Interchange Double-Ring Bullet */}
      <div className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-amber-400 flex items-center justify-center shadow-md">
        <div className="w-2.5 h-2.5 rounded-full border border-amber-300 bg-amber-400/30 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-amber-300" />
        </div>
      </div>

      {/* Prominent High-Contrast Interchange Event Box */}
      <div className="bg-amber-950/20 border-2 border-amber-500/60 rounded-xl p-4 space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
            <ArrowLeftRight className="w-4 h-4" />
            <span>CHANGE AT {segment.atStation.name.toUpperCase()}</span>
          </div>
          <span className="text-xs font-mono font-bold text-amber-300">
            ~{segment.estimatedTransferMinutes || 4} min transfer
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded border"
            style={{
              backgroundColor: `${fromLine?.color || "#0072CE"}20`,
              borderColor: `${fromLine?.color || "#0072CE"}50`,
              color: fromLine?.color || "#0072CE",
            }}
          >
            {fromLine?.name}
          </span>
          <span className="text-amber-400 font-bold">→</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded border"
            style={{
              backgroundColor: `${toLine?.color || "#00A651"}20`,
              borderColor: `${toLine?.color || "#00A651"}50`,
              color: toLine?.color || "#00A651",
            }}
          >
            {toLine?.name}
          </span>
        </div>

        <p className="text-xs text-slate-300 pt-1">
          Follow signs inside concourse toward{" "}
          <strong className="text-white">{toLine?.name}</strong> platforms.
        </p>
      </div>
    </div>
  );
}

function renderLastMile(segment: LastMileWalkSegment) {
  return (
    <div>
      {/* Destination Bullet */}
      <div className="absolute -left-7 top-0 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center shadow-md">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1.5 transition-colors group-hover:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
            DESTINATION / LAST MILE
          </span>
          <span className="text-xs font-mono text-slate-400">
            ~{segment.estimatedWalkMinutes} min
          </span>
        </div>

        <div className="text-sm font-bold text-white">
          {segment.destinationName}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <Footprints className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Exit <strong className="text-slate-200">{segment.fromStation.name}</strong> and walk{" "}
            {formatDistance(segment.distanceKm)} to final destination.
          </span>
        </div>
      </div>
    </div>
  );
}
