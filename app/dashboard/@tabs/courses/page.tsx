"use client";

import { useEffect, useState, useCallback } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { Courses, SemesterList } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";

export default function CoursesTab() {
  const [courses, setCourses] = useState<Courses | null>(null);
  const [semesters, setSemesters] = useState<SemesterList | null>(null);
  const [loading, setLoading] = useState(true);
  const [semesterRef, setSemesterRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (ref: string | null) => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setLoading(true);
    setError(null);

    try {
      const [coursesData, semestersData] = await Promise.all([
        ref ? amizoneApi.getCoursesBySemester(credentials, ref) : amizoneApi.getCourses(credentials),
        amizoneApi.getSemesters(credentials).catch(() => null)
      ]);
      setCourses(coursesData);
      if (semestersData) setSemesters(semestersData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(semesterRef);
  }, [semesterRef, fetchData]);

  if (loading && !courses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm py-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Semester</CardTitle>
          <CardDescription>Switch semesters to view older courses.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={semesterRef === null ? "default" : "outline"}
            onClick={() => setSemesterRef(null)}
            disabled={loading}
            className="font-bold uppercase text-[10px] tracking-widest"
          >
            Current
          </Button>
          {(semesters?.semesters || []).map((s) => (
            <Button
              key={s.ref}
              size="sm"
              variant={semesterRef === s.ref ? "default" : "outline"}
              onClick={() => setSemesterRef(s.ref)}
              disabled={loading}
              className="font-bold uppercase text-[10px] tracking-widest"
            >
              {s.name}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchData(semesterRef)}
            disabled={loading}
            className="font-bold uppercase text-[10px] tracking-widest ml-auto"
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5 py-6 p-12 text-center">
            <p className="text-destructive font-bold mb-4">{error}</p>
            <Button onClick={() => fetchData(semesterRef)} variant="outline">Retry</Button>
        </Card>
      ) : courses && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {courses.courses.map((course) => (
            <Card key={course.ref.code} className="group border-border hover:border-secondary transition-all shadow-sm py-6">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg font-bold group-hover:text-secondary-foreground transition-colors leading-tight line-clamp-2">
                  {course.ref.name}
                </CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  {course.type}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Separator className="mb-4 bg-border/50" />
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="opacity-60">Attendance</span>
                    <span className={getAttendanceColor(course.attendance)}>
                      {calculatePercentage(course.attendance)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="opacity-60">Internal Marks</span>
                    <span className="text-primary tabular-nums">
                      {course.internalMarks.have} / {course.internalMarks.max}
                    </span>
                  </div>
                </div>
                <Separator className="my-4 bg-border/50" />
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                  <span>{course.ref.code}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
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
