import { ScheduledClasses } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, User } from "lucide-react";

export function Schedule({ schedule }: { schedule: ScheduledClasses }) {
  if (schedule.classes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">No classes scheduled for today.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {schedule.classes.map((cls, i) => (
        <Card key={i} className="overflow-hidden border-border bg-card hover:bg-secondary/5 transition-all shadow-sm">
          <CardContent className="p-0 flex flex-col sm:flex-row">
            <div className="bg-muted sm:w-28 p-6 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-border shrink-0">
              <span className="text-sm font-black text-primary leading-none mb-1">{formatTime(cls.startTime)}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                {cls.startTime.substring(11, 16)} - {cls.endTime.substring(11, 16)}
              </span>
            </div>
            <div className="flex-grow p-6 flex flex-col justify-center">
              <div className="flex justify-between items-start gap-4 mb-3">
                <h4 className="text-base font-black leading-tight text-primary uppercase tracking-tight">
                  {cls.course.name.includes(' - ') ? cls.course.name.split(' - ')[1] : cls.course.name}
                </h4>
                <Badge variant={getBadgeVariant(cls.attendance)} className="font-black uppercase text-[10px] px-3 py-1">
                  {cls.attendance}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>{cls.faculty}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
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

function formatTime(timestamp: string) {
  // Ensure the timestamp is treated as UTC if it doesn't have a timezone suffix
  const dateStr = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
}

function getBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "PRESENT": return "default"; // Will be black/primary
    case "ABSENT": return "destructive";
    case "PENDING": return "secondary"; // Will be burlywood
    default: return "outline";
  }
}