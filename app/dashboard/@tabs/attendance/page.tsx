"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendanceTab() {
  const { attendance, loading, error, refresh } = useDashboard();

  if (loading && !attendance) {
    return (
      <Card className="py-4 md:py-6">
        <CardHeader className="px-4 md:px-6">
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !attendance) {
    return (
      <Card className="border-destructive/20 bg-destructive/5 text-center p-4 md:p-8">
        <p className="text-destructive font-bold mb-4">{error}</p>
        <Button onClick={refresh} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
      </Card>
    );
  }

  if (!attendance) return null;

  return (
    <Card className="border-border shadow-sm py-4 md:py-6">
      <CardHeader className="pb-0 px-4 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg md:text-xl font-black uppercase tracking-tight">Attendance Breakdown</CardTitle>
            <CardDescription>Detailed statistics per course for current semester</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex font-black uppercase text-[10px] tracking-widest h-9"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin mr-2" : "mr-2"} size={14} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-4 md:pt-6">
        <Table className="table-fixed md:table-auto">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-full md:w-[40%] font-bold uppercase text-[10px] tracking-widest px-3 md:px-6">Course</TableHead>
              <TableHead className="hidden md:table-cell font-bold uppercase text-[10px] tracking-widest">Ratio</TableHead>
              <TableHead className="hidden md:table-cell text-right font-bold uppercase text-[10px] tracking-widest px-6">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.records.map((record) => (
              <TableRow key={record.course.code} className="group transition-colors">
                <TableCell className="px-3 py-3 md:px-6 md:py-4 whitespace-normal align-top">
                  <div className="font-bold group-hover:text-primary transition-colors line-clamp-2 break-words">
                    {record.course.name}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {record.course.code}
                  </div>
                  <div className="mt-2 flex items-center gap-2 md:hidden">
                    <Badge
                      variant="outline"
                      className={`font-black tabular-nums border-2 ${getAttendanceColor(record.attendance)}`}
                    >
                      {calculatePercentage(record.attendance)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {record.attendance.attended} / {record.attendance.held}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell font-medium text-sm tabular-nums whitespace-nowrap">
                  {record.attendance.attended} / {record.attendance.held}
                </TableCell>
                <TableCell className="hidden md:table-cell text-right px-6">
                  <Badge
                    variant="outline"
                    className={`font-black tabular-nums border-2 ${getAttendanceColor(record.attendance)}`}
                  >
                    {calculatePercentage(record.attendance)}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function calculatePercentage(attendance: { attended: number; held: number }) {
  if (attendance.held === 0) return "100.00";
  return ((attendance.attended / attendance.held) * 100).toFixed(2);
}

function getAttendanceColor(attendance: { attended: number; held: number }) {
  const percentage = attendance.held === 0 ? 100 : (attendance.attended / attendance.held) * 100;
  if (percentage >= 75) return "text-primary border-primary";
  if (percentage >= 60) return "text-secondary-foreground border-secondary";
  return "text-destructive border-destructive";
}
