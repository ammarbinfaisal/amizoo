import { Attendance, AttendanceState, ScheduledClass, ScheduledClasses } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, MapPin, User } from "lucide-react";
import { formatAmizoneTime, formatClassRange } from "@/lib/date-utils";
import { format } from "date-fns";

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
    const dateStr = date ? format(date, "EEEE, MMM d") : "today";
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

        return (
          <Card
            key={i}
            className={cn(
              "overflow-hidden border-border bg-card hover:bg-secondary/5 transition-all shadow-sm group",
              isCancelled && "border-destructive/40 bg-destructive/5"
            )}
            noPadding
          >
            <CardContent className="p-0 flex flex-row h-24 sm:h-auto">
              <div
                className={cn(
                  "bg-muted w-20 sm:w-28 p-2 sm:p-6 flex flex-col items-center justify-center border-r border-border shrink-0",
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
                <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter text-center">
                  {formatClassRange(cls.startTime, cls.endTime)}
                </span>
              </div>
              <div className="flex-grow p-3 sm:p-6 flex flex-col justify-center min-w-0">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-1 sm:mb-3">
                  <div className="min-w-0 space-y-1">
                    <h4
                      className={cn(
                        "text-xs sm:text-base font-black leading-tight text-primary uppercase tracking-tight truncate",
                        isCancelled && "text-muted-foreground line-through decoration-1 decoration-destructive/70"
                      )}
                    >
                      {courseName}
                    </h4>
                    {isCancelled && (
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-destructive">
                        Cancelled
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {status && <StatusBadge status={status} />}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span className="truncate">{cls.faculty}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span>{cls.room}</span>
                    {attendance ? (
                      <>
                        <span className={cn("text-[9px] sm:text-[10px] font-normal tabular-nums flex items-center gap-1", getAttendanceColor(attendance))}>
                          {isCriticalAttendance(attendance) && <AlertTriangle className="h-3 w-3" />}
                          {calculatePercentage(attendance)}%
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-normal tabular-nums text-muted-foreground">
                          {attendance.attended}/{attendance.held}
                        </span>
                      </>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-normal tabular-nums text-muted-foreground/70">NA</span>
                    )}
                  </div>
                </div>
                {isCancelled && (
                  <p className="mt-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-destructive/80">
                    This slot is marked as cancelled—check with faculty for updates.
                  </p>
                )}
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
    const start = new Date(cls.startTime);
    const end = new Date(cls.endTime);

    // Only show PENDING if it's today
    const isToday = start.toDateString() === now.toDateString();
    if (isToday) {
      const midPoint = start.getTime() + (end.getTime() - start.getTime()) / 2;
      if (now.getTime() > midPoint) {
        return "PENDING";
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

function calculatePercentage(attendance: Attendance) {
  if (attendance.held === 0) return "100.00";
  return ((attendance.attended / attendance.held) * 100).toFixed(2);
}

function getAttendanceColor(attendance: Attendance) {
  const percentage = attendance.held === 0 ? 100 : (attendance.attended / attendance.held) * 100;
  if (percentage > 90) return "text-emerald-700";
  if (percentage >= 75) return "text-amber-600";
  if (percentage < 70) return "text-rose-800";
  return "text-red-700";
}

function isCriticalAttendance(attendance: Attendance) {
  const percentage = attendance.held === 0 ? 100 : (attendance.attended / attendance.held) * 100;
  return percentage < 70;
}
