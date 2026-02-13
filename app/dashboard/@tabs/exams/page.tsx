"use client";

import { useEffect, useState, useCallback } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { CourseRef } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type NormalizedExamItem = {
  course: CourseRef;
  mode?: string;
  location?: string;
  dateLabel: string;
  timeLabel: string;
};

export default function ExamsTab() {
  const [exams, setExams] = useState<NormalizedExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setLoading(true);
    setError(null);

    try {
      const data = await amizoneApi.getExamSchedule(credentials);
      setExams(normalizeExamItems(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase tracking-tight">Exam Schedule</h2>
        <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center text-sm text-destructive font-bold">{error}</CardContent>
        </Card>
      ) : exams.length > 0 ? (
        <div className="grid gap-3 sm:gap-4">
          {exams.map((exam, i) => (
            <Card key={i} className="overflow-hidden border-border bg-card shadow-sm">
              <CardContent className="p-4 sm:p-6 flex flex-row justify-between items-center gap-4">
                <div className="min-w-0">
                  <h4 className="font-black text-primary uppercase tracking-tight truncate sm:whitespace-normal">{exam.course.name}</h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider">{exam.course.code}</p>
                  {(exam.mode || exam.location) && (
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1 truncate">
                      {[exam.mode, exam.location].filter(Boolean).join(" • ")}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs sm:text-sm font-black text-primary whitespace-nowrap">{exam.dateLabel}</div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase whitespace-nowrap">{exam.timeLabel}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground font-medium">No exams scheduled at the moment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function normalizeExamItems(raw: unknown): NormalizedExamItem[] {
  if (!raw || typeof raw !== "object") return [];
  const examsValue = (raw as { exams?: unknown }).exams;
  if (!Array.isArray(examsValue)) return [];

  const items: NormalizedExamItem[] = [];
  for (const exam of examsValue) {
    if (!exam || typeof exam !== "object") continue;
    const course = exam.course;
    if (!course || typeof course.code !== "string" || typeof course.name !== "string") continue;

    const mode = typeof exam.mode === "string" ? exam.mode : undefined;
    const location = typeof exam.location === "string" ? exam.location : undefined;

    const timeValue = exam.time;
    if (typeof timeValue === "string" && timeValue.includes("T")) {
      const dt = new Date(timeValue);
      items.push({
        course,
        mode,
        location,
        dateLabel: dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }),
        timeLabel: dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
      });
      continue;
    }

    const dateLabel = typeof exam.date === "string" ? exam.date : "—";
    const timeLabel = typeof timeValue === "string" ? timeValue : "—";
    items.push({ course: course as CourseRef, mode, location, dateLabel, timeLabel });
  }

  return items;
}
