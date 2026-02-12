import { ScheduledClasses } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, User } from "lucide-react";
import { formatAmizoneTime, formatClassRange } from "@/lib/date-utils";
import { format } from "date-fns";

export function Schedule({ schedule, date }: { schedule: ScheduledClasses; date?: Date }) {
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
      {schedule.classes.map((cls, i) => (
        <Card
          key={i}
          className="overflow-hidden border-border bg-card hover:bg-secondary/5 transition-all shadow-sm"
          noPadding
        >
          <CardContent className="p-0 flex flex-row h-24 sm:h-auto">
            <div className="bg-muted w-20 sm:w-28 p-2 sm:p-6 flex flex-col items-center justify-center border-r border-border shrink-0">
              <span className="text-xs sm:text-sm font-black text-primary leading-none mb-1 text-center">
                {formatAmizoneTime(cls.startTime)}
              </span>
              <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-tighter text-center">
                {formatClassRange(cls.startTime, cls.endTime)}
              </span>
            </div>
            <div className="flex-grow p-3 sm:p-6 flex flex-col justify-center min-w-0">
              <div className="flex justify-between items-start gap-2 mb-1 sm:mb-3">
                <h4 className="text-xs sm:text-base font-black leading-tight text-primary uppercase tracking-tight truncate">
                  {cls.course.name.includes(' - ') ? cls.course.name.split(' - ')[1] : cls.course.name}
                </h4>
                <Badge variant={getBadgeVariant(cls.attendance)} className="font-black uppercase text-[8px] sm:text-[10px] px-2 sm:px-3 py-0.5 sm:py-1 shrink-0">
                  {cls.attendance}
                </Badge>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-6 gap-y-1 text-[10px] sm:text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span className="truncate">{cls.faculty}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span>{cls.room}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "PRESENT": return "default"; // Will be black/primary
    case "ABSENT": return "destructive";
    case "PENDING": return "secondary"; // Will be burlywood
    default: return "outline";
  }
}
