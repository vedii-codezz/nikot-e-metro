"use client";

import React from "react";
import { MetroStation } from "../../types/station";
import { getLineById } from "../../data/lines";
import { VERIFIED_INFORMAL_STANDS } from "../../data/informalTransit";
import { VERIFIED_BUS_STOPS, VERIFIED_BUS_ROUTES } from "../../data/busRoutes";
import { X, Navigation, ArrowRight, CheckCircle, AlertTriangle, Bus, Car, ArrowUpRight } from "lucide-react";

interface StationInspectorProps {
  station: MetroStation | null;
  onClose: () => void;
  onSetOrigin?: (station: MetroStation) => void;
  onSetDestination?: (station: MetroStation) => void;
}

export const StationInspector: React.FC<StationInspectorProps> = ({
  station,
  onClose,
  onSetOrigin,
  onSetDestination,
}) => {
  if (!station) return null;

  const isOperational = !station.status || station.status === "operational";
  const isConstruction = station.status === "under_construction";
  const isPlanned = station.status === "planned" || station.status === "approved";

  // Find nearby informal stands
  const nearbyStands = VERIFIED_INFORMAL_STANDS.filter(
    (s) => s.nearbyMetroStationId === station.id
  );

  // Find bus stops within station proximity
  const nearbyBusStops = VERIFIED_BUS_STOPS.filter((bs) => {
    const dLat = Math.abs(bs.coordinates.latitude - station.coordinates.latitude);
    const dLng = Math.abs(bs.coordinates.longitude - station.coordinates.longitude);
    return dLat < 0.005 && dLng < 0.005; // ~400m
  });

  const connectedBusRoutes = VERIFIED_BUS_ROUTES.filter((br) =>
    br.stopIds.some((sid) => nearbyBusStops.some((nbs) => nbs.id === sid))
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100 relative overflow-hidden">
      {/* Top Header & Close */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
              STATION INSPECTOR
            </span>
            {station.isInterchange && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ◎ INTERCHANGE
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white mt-1">
            {station.name}
          </h3>
          {station.bengaliName && (
            <p className="text-sm font-medium text-emerald-400 mt-0.5">
              {station.bengaliName}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status Badge */}
      <div className="mb-4">
        {isOperational && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Operational Passenger Service</span>
          </div>
        )}
        {isConstruction && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40 border-dashed">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Under Construction Alignment</span>
          </div>
        )}
        {isPlanned && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-950/80 text-purple-300 border border-purple-500/40">
            <span>Planned Network Alignment</span>
          </div>
        )}
      </div>

      {/* Action Buttons: From Here / To Here */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => onSetOrigin?.(station)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-[0.98]"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>FROM HERE</span>
        </button>

        <button
          type="button"
          onClick={() => onSetDestination?.(station)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-[0.98]"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>TO HERE</span>
        </button>
      </div>

      <div className="space-y-3.5 pt-2 border-t border-slate-800/80">
        {/* Serving Lines */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            Connections & Lines
          </span>
          <div className="flex flex-wrap gap-1.5">
            {station.lineIds.map((lid) => {
              const line = getLineById(lid);
              if (!line) return null;
              return (
                <span
                  key={lid}
                  className="px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1.5"
                  style={{
                    backgroundColor: `${line.color}20`,
                    borderColor: `${line.color}50`,
                    color: line.color,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <span>{line.name}</span>
                  <span className="opacity-70 font-normal">({line.lineCode})</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Nearby Multimodal Transit Connections */}
        {(connectedBusRoutes.length > 0 || nearbyStands.length > 0) && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Multimodal Access
            </span>
            <div className="space-y-1.5">
              {connectedBusRoutes.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                  <Bus className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="font-mono text-slate-400">Bus Routes:</span>
                  <div className="flex gap-1 flex-wrap font-mono font-bold text-white">
                    {connectedBusRoutes.map((b) => (
                      <span key={b.id} className="px-1.5 py-0.5 rounded bg-slate-700/80">
                        {b.routeNumber}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {nearbyStands.map((stand) => (
                <div
                  key={stand.id}
                  className="flex items-center justify-between text-xs text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{stand.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 capitalize">
                    {stand.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
