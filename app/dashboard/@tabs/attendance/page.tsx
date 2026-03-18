"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BookOpenText, ListChecks, Percent, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshSkeletonOverlay } from "@/components/ui/refresh-skeleton-overlay";
import { cn } from "@/lib/utils";
import {
  calculateAttendancePercentage,
  formatAttendanceRatio,
  getAttendanceBadgeColor,
  getAttendanceTextColor,
  isCriticalAttendance,
} from "@/lib/course-metrics";

export default function AttendanceTab() {
  const { attendance, loading, error, refresh } = useDashboard();

  if (loading && !attendance) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error && !attendance) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive text-sm">Attendance Unavailable</CardTitle>
          <CardDescription className="text-xs">{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={refresh} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!attendance) return null;

  return (
    <RefreshSkeletonOverlay loading={loading} hasData={Boolean(attendance)}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Attendance</h2>
            <p className="text-sm text-muted-foreground">
              Per-course attendance in the same compact card style as schedule.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="font-black uppercase text-[10px] tracking-widest"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin mr-2" : "mr-2"} size={14} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3">
          {attendance.records.map((record) => {
            const percentage = calculateAttendancePercentage(record.attendance);
            const ratio = formatAttendanceRatio(record.attendance);
            const critical = isCriticalAttendance(record.attendance);
            const statusLabel = percentage === "NA" ? "Unmarked" : critical ? "Critical" : "On Track";

            return (
              <Card
                key={record.course.code}
                className="group overflow-hidden border-border bg-card shadow-sm transition-all hover:bg-secondary/5"
                noPadding
              >
                <CardContent className="flex p-0">
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center border-r border-border bg-muted px-3 py-3 sm:w-28 sm:px-4">
                    <span className={cn("text-base font-black tabular-nums sm:text-lg", getAttendanceTextColor(record.attendance))}>
                      {percentage === "NA" ? "NA" : `${percentage}%`}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {ratio}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black uppercase tracking-tight text-primary transition-colors group-hover:text-primary/80 sm:text-base">
                          {record.course.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <BookOpenText className="h-3 w-3" />
                          <span>{record.course.code}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit border text-[10px] font-black uppercase tracking-widest",
                          getAttendanceBadgeColor(record.attendance)
                        )}
                      >
                        {critical && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {statusLabel}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-[10px] font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:text-xs">
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="h-3 w-3 shrink-0" />
                        <span className="uppercase tracking-wide">Classes attended</span>
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        <span className="flex items-center gap-1 tabular-nums">
                          <Percent className="h-3 w-3 opacity-70" />
                          {percentage === "NA" ? "NA" : `${percentage}%`}
                        </span>
                        <span className="tabular-nums text-foreground">{ratio}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </RefreshSkeletonOverlay>
  );
}
