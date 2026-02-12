"use client";

import { useState, type MouseEvent } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AttendanceScreenshotButton() {
  const [loading, setLoading] = useState(false);

  const handleScreenshot = async (e: MouseEvent<HTMLButtonElement>) => {
    setLoading(true);
    try {
      const target = (e.currentTarget as HTMLElement).closest(
        '[data-attendance-screenshot-root="true"]'
      ) as HTMLElement | null;
      if (!target) throw new Error("Screenshot target not found");

      // Load html2canvas on demand to keep the initial bundle small.
      const fontsReady = document.fonts?.ready?.catch(() => undefined) ?? Promise.resolve();
      const [{ default: html2canvas }] = await Promise.all([
        import("html2canvas"),
        // Best-effort: wait for fonts to be ready so the canvas matches UI.
        fontsReady,
      ]);

      const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return el.dataset.screenshotIgnore === "true";
        },
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) return reject(new Error("Failed to encode screenshot"));
          resolve(b);
        }, "image/png");
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${new Date().toISOString().split("T")[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Screenshot downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to capture screenshot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="md:hidden h-9 w-9"
        onClick={handleScreenshot}
        data-screenshot-ignore="true"
        disabled={loading}
      >
        <Camera className={loading ? "animate-pulse" : ""} size={16} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex font-black uppercase text-[10px] tracking-widest h-9"
        onClick={handleScreenshot}
        data-screenshot-ignore="true"
        disabled={loading}
      >
        <Camera className={loading ? "animate-pulse mr-2" : "mr-2"} size={14} />
        Screenshot
      </Button>
    </>
  );
}
