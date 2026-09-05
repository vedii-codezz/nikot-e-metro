"use client";

import React from "react";
import { Car, ExternalLink, ShieldAlert } from "lucide-react";

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
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Ride-Hailing Deep Links</h4>
            <p className="text-[11px] text-slate-400">
              Official app deep-links with prefilled pickup and drop-off coordinates
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        {rideHail.uber && (
          <a
            href={rideHail.uber}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-black hover:bg-neutral-900 text-white text-xs font-semibold border border-neutral-700 transition-all shadow-md"
          >
            <span>Uber</span>
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          </a>
        )}

        {rideHail.ola && (
          <a
            href={rideHail.ola}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-lime-600 hover:bg-lime-500 text-black text-xs font-bold transition-all shadow-md"
          >
            <span>Ola</span>
            <ExternalLink className="w-3.5 h-3.5 text-black/70" />
          </a>
        )}
      </div>

      {rideHail.rapido && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Rapido universal coordinate prefill unverified</span>
          </div>
          <a
            href={rideHail.rapido}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            <span>Rapido Web</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
