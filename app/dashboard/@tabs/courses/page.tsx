"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { amizoneApi, amizoneCache, getSessionUser } from "@/lib/api";
import { Courses, SemesterList } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, FileText, ListChecks, Percent, RefreshCw } from "lucide-react";
import { RefreshSkeletonOverlay } from "@/components/ui/refresh-skeleton-overlay";
import {
  calculateAttendancePercentage,
  formatAttendanceRatio,
  formatInternalMarks,
  getAttendanceBadgeColor,
} from "@/lib/course-metrics";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

export default function CoursesTab() {
  const [courses, setCourses] = useState<Courses | null>(null);
  const [semesters, setSemesters] = useState<SemesterList | null>(null);
  const [loading, setLoading] = useState(true);
  const [semesterRef, setSemesterRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!getSessionUser()) return;

    const cachedCourses = semesterRef
      ? amizoneCache.getCoursesBySemester(semesterRef)
      : amizoneCache.getCourses();
    const cachedSemesters = amizoneCache.getSemesters();

    if (!cachedCourses && !cachedSemesters) return;

    if (cachedCourses) {
      setCourses(cachedCourses);
      setLoading(false);
    }

    if (cachedSemesters) {
      setSemesters((current) => current ?? cachedSemesters);
    }
  }, [semesterRef]);

  const fetchData = useCallback(async (ref: string | null, opts?: { fresh?: boolean }) => {
    if (!getSessionUser()) return;

    setLoading(true);
    setError(null);
    const init = opts?.fresh ? { fresh: true } : undefined;

    try {
      const [coursesData, semestersData] = await Promise.all([
        ref ? amizoneApi.getCoursesBySemester(ref, init) : amizoneApi.getCourses(init),
        amizoneApi.getSemesters(init).catch(() => null),
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
    fetchData(semesterRef, { fresh: false });
  }, [semesterRef, fetchData]);

  if (loading && !courses) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <RefreshSkeletonOverlay
      loading={loading}
      hasData={Boolean(courses)}
    >
      <div className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest">
              Semester
            </CardTitle>
            <CardDescription>
              Switch semesters to view older courses with the same layout and syllabus shortcuts.
            </CardDescription>
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
              onClick={() => fetchData(semesterRef, { fresh: true })}
              disabled={loading}
              className="ml-auto font-bold uppercase text-[10px] tracking-widest"
            >
              <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {error && !courses && (
          <Card className="border-destructive/20 bg-destructive/5 p-8 text-center md:p-12">
            <p className="mb-4 font-bold text-destructive">{error}</p>
            <Button
              onClick={() => fetchData(semesterRef, { fresh: true })}
              variant="outline"
            >
              Retry
            </Button>
          </Card>
        )}

        {courses && (
          <div className="grid gap-3">
            {courses.courses.map((course) => {
              const attendancePercentage = calculateAttendancePercentage(course.attendance);

              return (
                <Card
                  key={course.ref.code}
                  className="group overflow-hidden border-border bg-card shadow-sm transition-all hover:bg-secondary/5"
                  noPadding
                >
                  <CardContent className="flex flex-col p-0 sm:flex-row">
                    <div className="border-b border-border bg-muted px-4 py-3 sm:w-32 sm:border-b-0 sm:border-r sm:px-4 sm:py-4">
                      <div className="text-sm font-black uppercase tracking-widest text-primary sm:text-center">
                        {course.ref.code}
                      </div>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-center">
                        {course.type}
                      </p>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black uppercase tracking-tight text-primary sm:text-base">
                            {course.ref.name}
                          </h3>

                        </div>

                        {course.syllabusDoc ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="font-black uppercase text-[10px] tracking-widest"
                          >
                            <a href={course.syllabusDoc} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-3 w-3" />
                              Syllabus
                            </a>
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                          >
                            No Syllabus Link
                          </Badge>
                        )}
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <MetricTile
                          icon={<Percent className="h-3 w-3" />}
                          label="Attendance"
                          value={attendancePercentage === "NA" ? "NA" : `${attendancePercentage}%`}
                          accent={getAttendanceBadgeColor(course.attendance)}
                        />
                        <MetricTile
                          icon={<ListChecks className="h-3 w-3" />}
                          label="Classes"
                          value={formatAttendanceRatio(course.attendance)}
                        />
                        <MetricTile
                          icon={<FileText className="h-3 w-3" />}
                          label="Internal Marks"
                          value={formatInternalMarks(course.internalMarks)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RefreshSkeletonOverlay>
  );
}

function MetricTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-sm font-black tabular-nums ${accent ?? "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}
