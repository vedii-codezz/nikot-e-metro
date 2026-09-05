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
  Shuffle,
  ChevronDown,
  ChevronUp,
  MapPin,
  CircleDot,
} from "lucide-react";
import clsx from "clsx";

interface RouteTimelineProps {
  route: JourneyRoute;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({ route }) => {
  const [expandedSegments, setExpandedSegments] = useState<Record<number, boolean>>({});

  const toggleExpand = (index: number) => {
    setExpandedSegments((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-transit-muted px-1">
        Journey Steps & Route Itinerary
      </h4>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-transit-border">
        {route.segments.map((segment, index) => (
          <div key={index} className="relative">
            {renderSegment(segment, index, expandedSegments[index], () =>
              toggleExpand(index)
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
  onToggleExpand: () => void
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
      {/* Node marker */}
      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-transit-card border-2 border-metro-blue flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-metro-blue" />
      </div>

      <div className="bg-transit-card/40 border border-transit-border rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-transit-text">
          <MapPin className="w-3.5 h-3.5 text-metro-blue" />
          <span>Start at {segment.originName}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-transit-muted font-mono pl-5">
          <Footprints className="w-3 h-3 text-transit-muted" />
          <span>
            Walk ~{formatDistance(segment.distanceKm)} to {segment.targetStation.name} (~{segment.estimatedWalkMinutes} min est.)
          </span>
        </div>
      </div>
    </div>
  );
}

function renderMetroRide(
  segment: MetroRideSegment,
  isExpanded: boolean,
  onToggleExpand: () => void
) {
  const line = getLineById(segment.lineId);
  const color = line?.color || "#0072CE";

  return (
    <div>
      {/* Node marker */}
      <div
        className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-transit-bg border-2 flex items-center justify-center"
        style={{ borderColor: color }}
      >
        <Train className="w-2.5 h-2.5" style={{ color }} />
      </div>

      <div
        className="rounded-lg p-3 border space-y-2.5"
        style={{
          backgroundColor: `${color}08`,
          borderColor: `${color}30`,
        }}
      >
        {/* Line & Boarding Info */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: color, color: "#FFFFFF" }}
              >
                {line?.name} ({line?.lineCode})
              </span>
              <span className="text-xs font-semibold text-transit-text">
                Board at {segment.fromStation.name}
              </span>
            </div>
            {segment.fromStation.bengaliName && (
              <p className="text-[11px] text-transit-muted mt-0.5">
                {segment.fromStation.bengaliName}
              </p>
            )}
          </div>

          <span className="text-[11px] font-mono text-transit-muted shrink-0">
            ~{segment.travelMinutes} min
          </span>
        </div>

        {/* Intermediate Stops preview / accordion */}
        {segment.stations.length > 2 && (
          <div className="pt-2 border-t border-transit-border/50">
            <button
              type="button"
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 text-xs text-transit-muted hover:text-transit-text font-medium transition-colors"
            >
              <CircleDot className="w-3 h-3" style={{ color }} />
              <span>
                {segment.stopCount} stops (Ride towards {segment.toStation.name})
              </span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 ml-1" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-1" />
              )}
            </button>

            {isExpanded && (
              <ul className="mt-2 pl-4 space-y-1.5 border-l-2 ml-1" style={{ borderColor: `${color}40` }}>
                {segment.stations.slice(1, -1).map((st) => (
                  <li key={st.id} className="text-xs text-transit-muted flex items-baseline gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-transit-muted" />
                    <span>{st.name}</span>
                    {st.bengaliName && (
                      <span className="text-[10px] text-transit-muted/80">
                        ({st.bengaliName})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Deboarding Station */}
        <div className="pt-2 border-t border-transit-border/50 flex items-baseline justify-between">
          <div className="text-xs text-transit-text font-medium">
            Alight at <span className="font-bold">{segment.toStation.name}</span>
          </div>
          {segment.toStation.bengaliName && (
            <span className="text-[11px] text-transit-muted">
              {segment.toStation.bengaliName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function renderInterchange(segment: InterchangeSegment) {
  const fromLine = getLineById(segment.fromLineId);
  const toLine = getLineById(segment.toLineId);

  return (
    <div>
      {/* Node marker */}
      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-purple-950 border-2 border-purple-500 flex items-center justify-center text-purple-300">
        <Shuffle className="w-2.5 h-2.5" />
      </div>

      <div className="bg-purple-950/20 border border-purple-800/40 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
            <Shuffle className="w-3.5 h-3.5" />
            <span>Interchange at {segment.atStation.name}</span>
          </div>
          {segment.estimatedTransferMinutes && (
            <span className="text-[10px] font-mono text-purple-300/80">
              ~{segment.estimatedTransferMinutes} min transfer
            </span>
          )}
        </div>

        <p className="text-xs text-transit-muted">
          Transfer from <span className="font-semibold text-transit-text">{fromLine?.name}</span> to{" "}
          <span className="font-semibold text-transit-text">{toLine?.name}</span> via station concourse.
        </p>
      </div>
    </div>
  );
}

function renderLastMile(segment: LastMileWalkSegment) {
  return (
    <div>
      {/* Node marker */}
      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-transit-card border-2 border-rose-400 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      </div>

      <div className="bg-transit-card/40 border border-transit-border rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
          <MapPin className="w-3.5 h-3.5" />
          <span>Arrive at {segment.destinationName}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-transit-muted font-mono pl-5">
          <Footprints className="w-3 h-3 text-transit-muted" />
          <span>
            Walk ~{formatDistance(segment.distanceKm)} from {segment.fromStation.name} (~{segment.estimatedWalkMinutes} min est.)
          </span>
        </div>
      </div>
    </div>
  );
}
