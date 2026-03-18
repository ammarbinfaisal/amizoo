import { Attendance, AttendanceState, ScheduledClass, ScheduledClasses } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, ListChecks, MapPin, Percent, User } from "lucide-react";
import { formatAmizoneTime, formatClassRange, formatISODateInIST, formatLongDateLabelIST, getMinutesInIST } from "@/lib/date-utils";
import {
  calculateAttendancePercentage,
  formatAttendanceRatio,
  getAttendanceTextColor,
  isCriticalAttendance,
} from "@/lib/course-metrics";

export function Schedule({
  schedule,
  date,
  attendanceByCourse,
}: {
  schedule: ScheduledClasses;
  date?: Date;
  attendanceByCourse?: Record<string, Attendance> | null;
}) {
  if (schedule.classes.length === 0) {
    const dateStr = date ? formatLongDateLabelIST(date) : "today";
    return (
      <Card className="border-dashed" noPadding>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">No classes scheduled for {dateStr}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {schedule.classes.map((cls, i) => {
        const status = getClassStatus(cls);
        const isCancelled = status === "CANCELLED";
        const courseName = cls.course.name.includes(" - ") ? cls.course.name.split(" - ")[1] : cls.course.name;
        const attendance = attendanceByCourse?.[cls.course.code];
        const attendancePercentage = attendance ? calculateAttendancePercentage(attendance) : "NA";

        return (
          <Card
            key={i}
            className={cn(
              "overflow-hidden border-border bg-card hover:bg-secondary/5 transition-all shadow-sm group",
              isCancelled && "border-destructive/40 bg-destructive/5"
            )}
            noPadding
          >
            <CardContent className="flex h-24 flex-row p-0 sm:h-auto">
              <div
                className={cn(
                  "flex w-20 shrink-0 flex-col items-center justify-center border-r border-border bg-muted p-2 sm:w-24 sm:p-4",
                  isCancelled && "bg-destructive/5 border-destructive/30"
                )}
              >
                <span
                  className={cn(
                    "text-xs sm:text-sm font-black text-primary leading-none mb-1 text-center",
                    isCancelled && "text-destructive"
                  )}
                >
                  {formatAmizoneTime(cls.startTime)}
                </span>
                <span className="text-center text-[8px] font-bold uppercase tracking-tighter text-muted-foreground sm:text-[10px]">
                  {formatClassRange(cls.startTime, cls.endTime)}
                </span>
              </div>
              <div className="flex min-w-0 flex-grow flex-col justify-center p-3 sm:p-4">
                <div className="mb-1 flex flex-col gap-1 sm:mb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 space-y-1">
                    <h4
                      className={cn(
                        "text-xs sm:text-base font-black leading-tight text-primary uppercase tracking-tight truncate",
                        isCancelled && "text-muted-foreground line-through decoration-1 decoration-destructive/70"
                      )}
                    >
                      {courseName}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {status && <StatusBadge status={status} />}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-[10px] font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:text-xs">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="flex min-w-0 items-center gap-1.5 truncate">
                      <User className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                      <span className="truncate">{cls.faculty}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <MapPin className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                      <span>{cls.room}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                    {attendance ? (
                      <>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[10px] font-semibold tabular-nums sm:text-[11px]",
                            getAttendanceTextColor(attendance)
                          )}
                        >
                          {isCriticalAttendance(attendance) && <AlertTriangle className="h-3 w-3" />}
                          <Percent className="h-3 w-3 opacity-70" />
                          {attendancePercentage === "NA" ? "NA" : `${attendancePercentage}%`}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold tabular-nums text-muted-foreground sm:text-[11px]">
                          <ListChecks className="h-3 w-3 opacity-70" />
                          {formatAttendanceRatio(attendance)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[9px] font-normal tabular-nums text-muted-foreground/70 sm:text-[10px]">NA</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function getClassStatus(cls: ScheduledClass) {
  if (cls.cancelled) return "CANCELLED";
  if (cls.attendance === AttendanceState.PRESENT) return "PRESENT";
  if (cls.attendance === AttendanceState.ABSENT) return "ABSENT";

  if (cls.attendance === AttendanceState.PENDING) {
    const now = new Date();
    const todayIst = formatISODateInIST(now);
    const startDate = cls.startTime?.includes("T") ? cls.startTime.split("T")[0] : "";

    // Only show PENDING if it's today (IST)
    if (startDate === todayIst) {
      const toMinutes = (ts: string): number | null => {
        const raw = ts.includes("T") ? ts.split("T")[1] : ts;
        const hhmm = raw.substring(0, 5);
        const [hh, mm] = hhmm.split(":");
        const hour = Number(hh);
        const minute = Number(mm);
        if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
        return hour * 60 + minute;
      };

      const startMinutes = toMinutes(cls.startTime);
      const endMinutes = toMinutes(cls.endTime);
      const nowMinutes = getMinutesInIST(now);

      if (startMinutes != null && endMinutes != null) {
        const midPointMinutes = startMinutes + (endMinutes - startMinutes) / 2;
        if (nowMinutes > midPointMinutes) return "PENDING";
      }
    }
  }

  return null;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    CANCELLED: "border-destructive/40 text-destructive bg-destructive/5",
    PRESENT: "border-emerald-500/40 text-emerald-700 bg-emerald-50/50",
    ABSENT: "border-rose-500/40 text-rose-700 bg-rose-50/50",
    PENDING: "border-amber-500/40 text-amber-700 bg-amber-50/50",
  };

  return (
    <span
      className={cn(
        "font-black uppercase text-[8px] sm:text-[10px] px-2 sm:px-3 py-0.5 sm:py-1 border rounded-md shrink-0",
        variants[status] || "border-muted-foreground/40 text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}
