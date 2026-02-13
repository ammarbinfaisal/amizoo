"use client";

import { useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ScheduledClasses } from "@/lib/types";
import { format } from "date-fns";
import { AmizoneScheduleSnapshot } from "@/components/AmizoneScheduleSnapshot";

export function ScheduleScreenshotButton({
  date,
  schedule,
  disabled,
}: {
  date: Date;
  schedule: ScheduledClasses | null;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filename = useMemo(() => `schedule-${format(date, "yyyy-MM-dd")}.png`, [date]);

  const handleScreenshot = async () => {
    if (!schedule) return;
    const el = containerRef.current;
    if (!el) return;

    setLoading(true);
    try {
      const mod = await import("html2canvas");
      const html2canvas = mod.default;

      const canvas = await html2canvas(el, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode PNG"))), "image/png");
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Schedule screenshot downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to capture schedule screenshot");
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
        disabled={Boolean(disabled) || loading || !schedule}
        title="Download schedule screenshot"
      >
        <Camera className={loading ? "animate-pulse" : ""} size={16} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex font-black uppercase text-[10px] tracking-widest h-9"
        onClick={handleScreenshot}
        disabled={Boolean(disabled) || loading || !schedule}
      >
        <Camera className={loading ? "animate-pulse mr-2" : "mr-2"} size={14} />
        Screenshot
      </Button>

      {/* Hidden offscreen render for html2canvas (must not be display:none). */}
      {schedule ? (
        <div
          ref={containerRef}
          style={{
            position: "fixed",
            top: 0,
            left: -100000,
            width: 1148,
            pointerEvents: "none",
            background: "#ffffff",
            borderColor: "#dddddd",
            color: "#333333",
          }}
        >
          <AmizoneScheduleSnapshot date={date} schedule={schedule} />
        </div>
      ) : null}
    </>
  );
}
