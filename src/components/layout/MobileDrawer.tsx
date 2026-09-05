"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown, Layers, MapPin } from "lucide-react";
import clsx from "clsx";

interface MobileDrawerProps {
  children: React.ReactNode;
  headerTitle?: string;
  peekSubtitle?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  children,
  headerTitle = "Search & Navigation",
  peekSubtitle,
}) => {
  // 3 sheet states: "peek" (60px), "summary" (280px), "full" (75vh)
  const [sheetState, setSheetState] = useState<"peek" | "summary" | "full">("summary");

  const cycleSheetState = () => {
    if (sheetState === "peek") setSheetState("summary");
    else if (sheetState === "summary") setSheetState("full");
    else setSheetState("peek");
  };

  const getSheetHeightClass = () => {
    switch (sheetState) {
      case "peek":
        return "h-14";
      case "summary":
        return "h-[300px]";
      case "full":
        return "h-[75vh]";
    }
  };

  return (
    <div
      className={clsx(
        "lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950 border-t border-slate-800 shadow-2xl transition-all duration-300 ease-in-out flex flex-col",
        getSheetHeightClass()
      )}
    >
      {/* Drawer Grab Bar & Header */}
      <button
        type="button"
        onClick={cycleSheetState}
        className="w-full py-2 px-4 flex items-center justify-between bg-slate-900 border-b border-slate-800/80 text-xs font-semibold text-slate-200 cursor-pointer select-none"
        aria-expanded={sheetState !== "peek"}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 rounded-full bg-slate-700 mx-auto" />
          <div className="text-left">
            <span className="block font-bold text-white tracking-tight">{headerTitle}</span>
            {peekSubtitle && (
              <span className="block text-[10px] text-slate-400 font-mono">
                {peekSubtitle}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="text-[10px] font-mono uppercase">
            {sheetState === "full" ? "COLLAPSE" : sheetState === "summary" ? "EXPAND" : "PEEK"}
          </span>
          {sheetState === "full" ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {children}
      </div>
    </div>
  );
};
