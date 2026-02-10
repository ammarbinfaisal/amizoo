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
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
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
      <Card className="border-destructive/20 bg-destructive/5 text-center p-12">
        <p className="text-destructive font-bold mb-4">{error}</p>
        <Button onClick={refresh} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Retry</Button>
      </Card>
    );
  }

  if (!attendance) return null;

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-xl font-black uppercase tracking-tight">Attendance Breakdown</CardTitle>
        <CardDescription>Detailed statistics per course for current semester</CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="w-[40%] min-w-[150px] font-bold uppercase text-[10px] tracking-widest px-6">Course</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-widest">Ratio</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest px-6">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.records.map((record) => (
                <TableRow key={record.course.code} className="group transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="font-bold group-hover:text-primary transition-colors line-clamp-2">{record.course.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{record.course.code}</div>
                  </TableCell>
                  <TableCell className="font-medium text-sm tabular-nums whitespace-nowrap">
                    {record.attendance.attended} / {record.attendance.held}
                  </TableCell>
                  <TableCell className="text-right px-6">
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
        </div>
      </CardContent>
    </Card>
  );
}

function calculatePercentage(attendance: { attended: number; held: number }) {
  if (attendance.held === 0) return 100;
  return Math.round((attendance.attended / attendance.held) * 100);
}

function getAttendanceColor(attendance: { attended: number; held: number }) {
  const percentage = calculatePercentage(attendance);
  if (percentage >= 75) return "text-primary border-primary";
  if (percentage >= 60) return "text-secondary-foreground border-secondary";
  return "text-destructive border-destructive";
}
