"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { amizoneApi, getSessionUser } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-context";
import { AttendanceRecords, ScheduledClasses } from "@/lib/types";
import { Schedule } from "@/components/Schedule";
import { DateSelector } from "@/components/DateSelector";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshSkeletonOverlay } from "@/components/ui/refresh-skeleton-overlay";
import { differenceInCalendarDaysIST, formatISODateInIST, getMinutesInIST, isTodayInIST } from "@/lib/date-utils";

const SCHEDULE_PUBLISH_CUTOFF_HOUR = Number(
  process.env.NEXT_PUBLIC_SCHEDULE_PUBLISH_CUTOFF_HOUR ?? "15"
);
const SCHEDULE_PUBLISH_CUTOFF_MINUTE = Number(
  process.env.NEXT_PUBLIC_SCHEDULE_PUBLISH_CUTOFF_MINUTE ?? "15"
);

function shouldForceFreshSchedule(selectedDate: Date, now: Date): boolean {
  const dayDiff = differenceInCalendarDaysIST(selectedDate, now);
  const minutesNow = getMinutesInIST(now);
  const cutoffMinutes = SCHEDULE_PUBLISH_CUTOFF_HOUR * 60 + SCHEDULE_PUBLISH_CUTOFF_MINUTE;

  return dayDiff >= 1 && minutesNow >= cutoffMinutes;
}

export default function ScheduleTab() {
  const {
    schedule: dashboardSchedule,
    attendance: dashboardAttendance,
  } = useDashboard();
  const [date, setDate] = useState<Date>(new Date());
  const [schedule, setSchedule] =
    useState<ScheduledClasses | null>(dashboardSchedule);
  const [attendance, setAttendance] =
    useState<AttendanceRecords | null>(dashboardAttendance);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isToday = isTodayInIST(date);

  useEffect(() => {
    if (isToday && dashboardSchedule) {
      setSchedule((current) => current ?? dashboardSchedule);
    }
  }, [dashboardSchedule, isToday]);

  useEffect(() => {
    if (dashboardAttendance) {
      setAttendance((current) => current ?? dashboardAttendance);
    }
  }, [dashboardAttendance]);

  const fetchSchedule = useCallback(
    async (d: Date, opts?: { fresh?: boolean }) => {
      if (!getSessionUser()) return;

      setLoading(true);
      setError(null);
      const dateStr = formatISODateInIST(d);
      const forceFresh = shouldForceFreshSchedule(d, new Date());
      const fresh = Boolean(opts?.fresh) || forceFresh;

      try {
        const schedulePromise =
          amizoneApi.getClassSchedule(dateStr, { fresh });

        const attendancePromise =
          (attendance ?? dashboardAttendance) && !opts?.fresh
            ? Promise.resolve(attendance ?? dashboardAttendance)
            : amizoneApi.getAttendance(fresh ? { fresh: true } : undefined);

        const [scheduleResult, attendanceResult] =
          await Promise.allSettled([
            schedulePromise,
            attendancePromise,
          ]);

        if (scheduleResult.status === "rejected") {
          throw scheduleResult.reason;
        }

        setSchedule(scheduleResult.value);

        if (attendanceResult.status === "fulfilled") {
          setAttendance(attendanceResult.value);
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to load schedule"
        );
      } finally {
        setLoading(false);
      }
    },
    [attendance, dashboardAttendance]
  );

  useEffect(() => {
    fetchSchedule(date);
  }, [date, fetchSchedule]);

  const visibleSchedule = isToday ? schedule ?? dashboardSchedule : schedule;
  const visibleAttendance = attendance ?? dashboardAttendance;

  const attendanceByCourse = useMemo(() => {
    if (!visibleAttendance) return null;

    return visibleAttendance.records.reduce<
      Record<string, { attended: number; held: number }>
    >((acc, record) => {
      acc[record.course.code] = record.attendance;
      return acc;
    }, {});
  }, [visibleAttendance]);
  const isInitialLoading = loading && !visibleSchedule;
  const hasSchedule = Boolean(visibleSchedule);
  const showBlockingError = Boolean(error && !visibleSchedule);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tight">
          Class Schedule
        </h2>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {/* Back to Today */}
          {!isTodayInIST(date) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDate(new Date())}
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              Back to Today
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              fetchSchedule(date, { fresh: true })
            }
            disabled={loading}
          >
            <RefreshCw
              className={
                loading ? "animate-spin mr-2" : "mr-2"
              }
              size={14}
            />
            Refresh
          </Button>

          {/* Date Selector */}
          <DateSelector
            date={date}
            onChange={setDate}
          />
        </div>
      </div>

      {/* CONTENT */}
      {isInitialLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : showBlockingError ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive text-sm">
              Schedule Unavailable
            </CardTitle>
            <CardDescription className="text-xs">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button
              onClick={() =>
                fetchSchedule(date, { fresh: true })
              }
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : visibleSchedule ? (
        <RefreshSkeletonOverlay
          loading={loading}
          hasData={hasSchedule}
        >
          <Schedule schedule={visibleSchedule} date={date} attendanceByCourse={attendanceByCourse} />
        </RefreshSkeletonOverlay>
      ) : null}
    </div>
  );
}
