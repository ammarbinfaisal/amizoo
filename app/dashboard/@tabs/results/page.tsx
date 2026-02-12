"use client";

import { useEffect, useState, useCallback } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { ExamResultRecords, SemesterList } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, RefreshCw } from "lucide-react";

export default function ResultsTab() {
  const [data, setData] = useState<ExamResultRecords | null>(null);
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
      const [resData, semData] = await Promise.all([
        ref ? amizoneApi.getExamResult(credentials, ref) : amizoneApi.getCurrentExamResult(credentials),
        amizoneApi.getSemesters(credentials).catch(() => null)
      ]);
      setData(resData);
      if (semData) setSemesters(semData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(semesterRef);
  }, [semesterRef, fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight">Exam Results</h2>
        <p className="text-sm text-muted-foreground">Detailed performance analysis</p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4 p-4 sm:p-6">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Semester</CardTitle>
          <CardDescription>Switch semesters to view older results.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-4 sm:p-6 pt-0">
          <Button
            size="sm"
            variant={semesterRef === null ? "default" : "outline"}
            onClick={() => setSemesterRef(null)}
            disabled={loading}
            className="font-bold uppercase text-[10px] tracking-widest"
          >
            Current
          </Button>
          {semesters?.semesters?.map((s) => (
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

      {loading && !data ? (
        <Skeleton className="h-[400px] w-full" />
      ) : error ? (
        <Card className="border-destructive/20 bg-destructive/5 p-12 text-center">
            <p className="text-destructive font-bold mb-4">{error}</p>
            <Button onClick={() => fetchData(semesterRef)} variant="outline">Retry</Button>
        </Card>
      ) : data && (
        <div className="space-y-6">
          {data.overall?.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-6">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="font-bold uppercase text-[10px] tracking-widest px-4 md:px-6">Semester</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-widest">SGPA</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-widest">CGPA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.overall.map((row) => (
                      <TableRow key={row.semester.semesterRef}>
                        <TableCell className="px-4 py-4 md:px-6 font-bold">{row.semester.semesterRef}</TableCell>
                        <TableCell className="py-4 font-medium tabular-nums">{row.semesterGradePointAverage.toFixed(2)}</TableCell>
                        <TableCell className="py-4 font-medium tabular-nums">{row.cumulativeGradePointAverage.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {data.courseWise?.length > 0 ? (
            <Card className="border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Course Results</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-6">
                <Table className="table-fixed md:table-auto">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="w-full md:w-[45%] font-bold uppercase text-[10px] tracking-widest px-4 md:px-6">Course</TableHead>
                      <TableHead className="hidden md:table-cell font-bold uppercase text-[10px] tracking-widest">Grade</TableHead>
                      <TableHead className="hidden md:table-cell font-bold uppercase text-[10px] tracking-widest">Points</TableHead>
                      <TableHead className="hidden md:table-cell font-bold uppercase text-[10px] tracking-widest">Credits</TableHead>
                      <TableHead className="hidden md:table-cell font-bold uppercase text-[10px] tracking-widest px-6 text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.courseWise.map((r) => (
                      <TableRow key={r.course.code} className="group transition-colors">
                        <TableCell className="px-4 py-3 md:px-6 md:py-4 whitespace-normal align-top">
                          <div className="font-bold group-hover:text-primary transition-colors line-clamp-2 break-words">{r.course.name}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{r.course.code}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 md:hidden">
                            <Badge variant="outline" className="font-black tabular-nums border-2 whitespace-nowrap text-[10px]">
                              {r.score.grade} ({r.score.gradePoint})
                            </Badge>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              {r.credits.points} pts • {r.credits.acquired}/{r.credits.effective} cr
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase ml-auto">
                              {formatTypeDate(r.publishDate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4">
                          <Badge variant="outline" className="font-black tabular-nums border-2 whitespace-nowrap">
                            {r.score.grade} ({r.score.gradePoint})
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell py-4 font-medium tabular-nums">{r.credits.points}</TableCell>
                        <TableCell className="hidden md:table-cell py-4 font-medium tabular-nums whitespace-nowrap">
                          {r.credits.acquired}/{r.credits.effective}
                        </TableCell>
                        <TableCell className="hidden md:table-cell px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {formatTypeDate(r.publishDate)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Award className="h-8 w-8 text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">No results available for this semester.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function formatTypeDate(d: { year: number; month: number; day: number } | undefined) {
  if (!d?.year || !d?.month || !d?.day) return "—";
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day));
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}
