"use client";

import React from "react";
import { Car, ExternalLink } from "lucide-react";

interface RideHailCardProps {
  rideHail?: {
    uber?: string;
    ola?: string;
    rapido?: string;
  };
}

export const RideHailCard: React.FC<RideHailCardProps> = ({ rideHail }) => {
  if (!rideHail || (!rideHail.uber && !rideHail.ola && !rideHail.rapido)) {
    return null;
  }

  return (
    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
            <Car className="w-3.5 h-3.5" />
          </div>
          <div>
            <h5 className="text-xs font-semibold text-slate-300">
              Direct / Last-Mile Ride-Hailing
            </h5>
            <p className="text-[10px] text-slate-500 font-mono">
              Official deep-links · Fares and drivers managed in provider apps
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1">
        {rideHail.uber && (
          <a
            href={rideHail.uber}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-black hover:bg-neutral-900 text-white text-xs font-semibold border border-neutral-800 transition-all active:scale-[0.98]"
          >
            <span>Uber</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </a>
        )}

        {rideHail.ola && (
          <a
            href={rideHail.ola}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-lime-600 hover:bg-lime-500 text-black text-xs font-bold transition-all active:scale-[0.98]"
          >
            <span>Ola</span>
            <ExternalLink className="w-3 h-3 text-black/70" />
          </a>
        )}

        {rideHail.rapido && (
          <a
            href={rideHail.rapido}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all active:scale-[0.98]"
          >
            <span>Rapido</span>
            <ExternalLink className="w-3 h-3 text-black/70" />
          </a>
        )}
      </div>
    </div>
  );
};
