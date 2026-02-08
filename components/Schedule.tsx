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
        <Card key={i} className="overflow-hidden border-border bg-card hover:bg-accent/5 transition-colors">
          <CardContent className="p-0 flex flex-col sm:flex-row">
            <div className="bg-secondary/20 sm:w-24 p-4 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-border">
              <span className="text-sm font-black">{formatTime(cls.startTime)}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{formatTime(cls.endTime)}</span>
            </div>
            <div className="flex-grow p-4 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <h4 className="font-bold leading-tight">{cls.course.name}</h4>
                <Badge variant={getBadgeVariant(cls.attendance)} className="font-bold shrink-0">
                  {cls.attendance}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
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
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function getBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
  switch (state) {
    case "PRESENT": return "default"; // Will be black/primary
    case "ABSENT": return "destructive";
    case "PENDING": return "secondary"; // Will be burlywood
    default: return "outline";
  }
}