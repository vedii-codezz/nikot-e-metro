"use client";

import React from "react";
import { MetroStation } from "../../types/station";
import { METRO_LINES, getLineById } from "../../data/lines";
import { VERIFIED_INFORMAL_STANDS } from "../../data/informalTransit";
import { VERIFIED_BUS_STOPS, VERIFIED_BUS_ROUTES } from "../../data/busRoutes";
import { X, Navigation, ArrowRight, AlertTriangle, CheckCircle, Bus, Car } from "lucide-react";

interface StationInfoModalProps {
  station: MetroStation | null;
  onClose: () => void;
  onSetOrigin?: (station: MetroStation) => void;
  onSetDestination?: (station: MetroStation) => void;
}

export const StationInfoModal: React.FC<StationInfoModalProps> = ({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close station modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Station Title & Bengali */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">{station.name}</h2>
            {station.isInterchange && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ◎ Interchange
              </span>
            )}
          </div>
          {station.bengaliName && (
            <p className="text-lg text-emerald-400 font-medium">{station.bengaliName}</p>
          )}
        </div>

        {/* Status Badge */}
        <div className="mb-4">
          {isOperational && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Operational Passenger Service</span>
            </div>
          )}
          {isConstruction && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-300 border border-amber-500/40 border-dashed">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Under Construction Corridor</span>
            </div>
          )}
          {isPlanned && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-950/80 text-purple-300 border border-purple-500/40">
              <span>Planned Network Alignment</span>
            </div>
          )}
        </div>

        {/* Lines Serving Station */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Metro Lines
          </h3>
          <div className="flex flex-wrap gap-2">
            {station.lineIds.map((lid) => {
              const line = getLineById(lid);
              return (
                <div
                  key={lid}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm"
                  style={{ backgroundColor: line?.color || "#334155" }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>{line?.name || lid.toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interchange details */}
        {station.isInterchange && station.interchangeConnections && (
          <div className="mb-5 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>◎ Operational Transfers</span>
            </h3>
            <p className="text-xs text-slate-300">
              Direct concourse walkway connection between{" "}
              {station.lineIds.map((l) => `${l.toUpperCase()} Line`).join(" and ")}.
            </p>
          </div>
        )}

        {/* Nearby Verified Feeder Transit */}
        {(connectedBusRoutes.length > 0 || nearbyStands.length > 0) && (
          <div className="mb-5 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nearby Multimodal Connections
            </h3>

            {/* Bus routes */}
            {connectedBusRoutes.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2">
                <Bus className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sky-300">WBTC Bus: </span>
                  {connectedBusRoutes.map((r) => r.routeNumber).join(", ")}
                </div>
              </div>
            )}

            {/* Auto/Toto stands */}
            {nearbyStands.map((stand) => (
              <div
                key={stand.id}
                className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2"
              >
                <Car className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-300">
                    {stand.type.toUpperCase()} Stand:{" "}
                  </span>
                  {stand.name} ({stand.routesServed})
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Journey Planning Actions */}
        <div className="pt-2 border-t border-slate-800">
          {isOperational ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onSetOrigin?.(station);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-xs text-white shadow-lg transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Plan from here</span>
              </button>
              <button
                onClick={() => {
                  onSetDestination?.(station);
                  onClose();
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-medium text-xs text-white shadow-lg transition-all"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Plan to here</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs text-center">
              ⚠️ Not currently available for passenger routing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
