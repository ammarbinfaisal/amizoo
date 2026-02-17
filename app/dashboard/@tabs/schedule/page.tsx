"use client";

import { useEffect, useState, useCallback } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { ScheduledClasses } from "@/lib/types";
import { Schedule } from "@/components/Schedule";
import { DateSelector } from "@/components/DateSelector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleScreenshotButton } from "@/components/ScheduleScreenshotButton";
import { differenceInCalendarDays } from "date-fns";

const SCHEDULE_PUBLISH_CUTOFF_HOUR = Number(process.env.NEXT_PUBLIC_SCHEDULE_PUBLISH_CUTOFF_HOUR ?? "15");
const SCHEDULE_PUBLISH_CUTOFF_MINUTE = Number(process.env.NEXT_PUBLIC_SCHEDULE_PUBLISH_CUTOFF_MINUTE ?? "15");

function shouldForceFreshSchedule(selectedDate: Date, now: Date): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const dayDiff = differenceInCalendarDays(selected, today);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = SCHEDULE_PUBLISH_CUTOFF_HOUR * 60 + SCHEDULE_PUBLISH_CUTOFF_MINUTE;

  return dayDiff >= 1 && minutesNow >= cutoffMinutes;
}

export default function ScheduleTab() {
  const [date, setDate] = useState<Date>(new Date());
  const [schedule, setSchedule] = useState<ScheduledClasses | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async (d: Date) => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setLoading(true);
    setError(null);
    const dateStr = d.toISOString().split("T")[0];
    const forceFresh = shouldForceFreshSchedule(d, new Date());

    try {
      const data = await amizoneApi.getClassSchedule(credentials, dateStr, { fresh: forceFresh });
      setSchedule(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(date);
  }, [date, fetchSchedule]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black uppercase tracking-tight">Class Schedule</h2>
        <div className="w-full flex justify-end sm:w-auto gap-2 items-center">
          <ScheduleScreenshotButton date={date} schedule={schedule} disabled={loading} />
          <Button
            variant="outline"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => fetchSchedule(date)}
            disabled={loading}
            title="Refresh schedule"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex font-black uppercase text-[10px] tracking-widest h-9"
            onClick={() => fetchSchedule(date)}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin mr-2" : "mr-2"} size={14} />
            Refresh
          </Button>
          <DateSelector date={date} onChange={setDate} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive text-sm">Schedule Unavailable</CardTitle>
            <CardDescription className="text-xs">{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => fetchSchedule(date)} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-3 w-3" /> Retry
            </Button>
          </CardContent>
        </Card>
      ) : schedule ? (
        <Schedule schedule={schedule} date={date} />
      ) : null}
    </div>
  );
}
