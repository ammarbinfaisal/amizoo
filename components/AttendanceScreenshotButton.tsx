"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { amizoneApi } from "@/lib/api";
import { toast } from "sonner";

export function AttendanceScreenshotButton() {
  const [loading, setLoading] = useState(false);

  const handleScreenshot = async () => {
    setLoading(true);
    try {
      const blob = await amizoneApi.getAttendanceScreenshot();
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
        disabled={loading}
      >
        <Camera className={loading ? "animate-pulse" : ""} size={16} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex font-black uppercase text-[10px] tracking-widest h-9"
        onClick={handleScreenshot}
        disabled={loading}
      >
        <Camera className={loading ? "animate-pulse mr-2" : "mr-2"} size={14} />
        Screenshot
      </Button>
    </>
  );
}
