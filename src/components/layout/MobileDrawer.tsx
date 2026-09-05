import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import clsx from "clsx";

interface MobileDrawerProps {
  children: React.ReactNode;
  headerTitle?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  children,
  headerTitle = "Search & Navigation",
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={clsx(
        "lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-transit-bg border-t border-transit-border shadow-2xl transition-all duration-300 ease-in-out flex flex-col",
        isExpanded ? "h-[65vh] max-h-[700px]" : "h-14"
      )}
    >
      {/* Header / Grab Handle */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full py-2.5 px-4 flex items-center justify-between bg-transit-card/80 border-b border-transit-border text-xs font-semibold text-transit-text cursor-pointer select-none"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-1 rounded-full bg-transit-muted/40 mx-auto" />
          <span>{headerTitle}</span>
        </div>

        <div className="p-1 rounded text-transit-muted">
          {isExpanded ? (
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
