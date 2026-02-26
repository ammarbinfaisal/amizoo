"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RefreshSkeletonOverlayProps = {
  loading: boolean;
  hasData: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  overlayClassName?: string;
};

export function RefreshSkeletonOverlay({
  loading,
  hasData,
  skeleton,
  children,
  className,
  contentClassName,
  overlayClassName,
}: RefreshSkeletonOverlayProps) {
  const showOverlay = loading && hasData;

  return (
    <div className={cn("relative", className)} aria-busy={showOverlay}>
      <div
        className={cn(
          "transition-opacity duration-200",
          showOverlay && "opacity-45 pointer-events-none select-none",
          contentClassName,
        )}
      >
        {children}
      </div>
      {showOverlay ? (
        <div
          className={cn(
            "absolute inset-0 z-10 rounded-[inherit] bg-background/60 p-4 backdrop-blur-[1px]",
            overlayClassName,
          )}
          role="status"
          aria-live="polite"
        >
          {skeleton}
        </div>
      ) : null}
    </div>
  );
}
