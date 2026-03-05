"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RefreshSkeletonOverlayProps = {
  loading: boolean;
  hasData: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  staleLabel?: string;
};

export function RefreshSkeletonOverlay({
  loading,
  hasData,
  children,
  className,
  contentClassName,
  staleLabel = "Refreshing data",
}: RefreshSkeletonOverlayProps) {
  const showStaleState = loading && hasData;

  return (
    <div className={cn("relative", className)} aria-busy={showStaleState}>
      <div className={contentClassName}>
        {children}
      </div>
      {showStaleState ? (
        <div
          className="pointer-events-none absolute right-3 top-3 z-10"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
            {staleLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
