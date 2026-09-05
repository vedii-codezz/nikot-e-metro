import React from "react";
import { Compass, Navigation } from "lucide-react";
import clsx from "clsx";

export type NavigationMode = "nearest" | "journey";

interface HeaderProps {
  activeMode: NavigationMode;
  onModeChange: (mode: NavigationMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeMode, onModeChange }) => {
  return (
    <header className="border-b border-transit-border bg-transit-bg/95 backdrop-blur-sm px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-7xl mx-auto">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-metro-blue/20 border border-metro-blue/40 flex items-center justify-center text-metro-blue font-mono font-bold text-sm">
            NM
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-semibold tracking-tight text-transit-text font-sans">
                Nikot-e-Metro
              </h1>
              <span className="text-xs text-transit-muted font-sans tracking-normal">
                নিকটে মেট্রো
              </span>
            </div>
            <p className="text-[11px] text-transit-muted">
              Kolkata Metro Navigation & Routing
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <nav className="flex items-center bg-transit-card border border-transit-border p-1 rounded-lg self-start sm:self-auto" aria-label="Mode Selection">
          <button
            type="button"
            onClick={() => onModeChange("nearest")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeMode === "nearest"
                ? "bg-metro-blue text-white shadow-sm"
                : "text-transit-muted hover:text-transit-text hover:bg-transit-cardHover"
            )}
            aria-pressed={activeMode === "nearest"}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Find Nearest Metro</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange("journey")}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              activeMode === "journey"
                ? "bg-metro-green text-white shadow-sm"
                : "text-transit-muted hover:text-transit-text hover:bg-transit-cardHover"
            )}
            aria-pressed={activeMode === "journey"}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Plan Journey</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
