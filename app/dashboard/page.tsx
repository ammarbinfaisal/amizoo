"use client";

import { useCallback, useEffect, useState } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Schedule } from "@/components/Schedule";
import {
  AttendanceRecord,
  AttendanceRecords,
  CourseRef,
  Courses,
  ExamResultRecords,
  ExaminationSchedule,
  Profile,
  ScheduledClasses,
  SemesterList,
  WifiInfo,
  WifiMacInfo,
} from "@/lib/types";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Award, BarChart3, Calendar, FileText, GraduationCap, LogOut, MessageSquareText, RefreshCw, Trash2, Wifi } from "lucide-react";

type DashboardTab = "schedule" | "attendance" | "courses" | "exams" | "results" | "wifi" | "feedback";

type DashboardState = {
  activeTab: DashboardTab;
  loading: boolean;
  profile: Profile | null;
  profileError: string | null;
  attendance: AttendanceRecords | null;
  attendanceError: string | null;
  schedule: ScheduledClasses | null;
  scheduleError: string | null;
  courses: Courses | null;
  coursesError: string | null;
  coursesLoading: boolean;
  coursesSemesterRef: string | null; // null = current semester
  wifiMac: WifiMacInfo | null;
  examSchedule: ExaminationSchedule | null;
  results: {
    loading: boolean;
    error: string | null;
    semesters: SemesterList | null;
    semesterRef: string | null; // null = current semester
    data: ExamResultRecords | null;
  };
  wifi: {
    loading: boolean;
    error: string | null;
    address: string;
    overrideLimit: boolean;
  };
  feedback: {
    loading: boolean;
    error: string | null;
    rating: number;
    queryRating: number;
    comment: string;
    filledFor: number | null;
  };
};

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>({
    activeTab: "schedule",
    loading: true,
    profile: null,
    profileError: null,
    attendance: null,
    attendanceError: null,
    schedule: null,
    scheduleError: null,
    courses: null,
    coursesError: null,
    coursesLoading: false,
    coursesSemesterRef: null,
    wifiMac: null,
    examSchedule: null,
    results: {
      loading: false,
      error: null,
      semesters: null,
      semesterRef: null,
      data: null,
    },
    wifi: {
      loading: false,
      error: null,
      address: "",
      overrideLimit: false,
    },
    feedback: {
      loading: false,
      error: null,
      rating: 5,
      queryRating: 3,
      comment: "",
      filledFor: null,
    },
  });

  const fetchCoreData = useCallback(async () => {
    const credentials = getLocalCredentials();

    if (!credentials) {
      router.push("/login");
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.allSettled([
      amizoneApi.getProfile(credentials),
      amizoneApi.getAttendance(credentials),
      amizoneApi.getClassSchedule(credentials, today),
      amizoneApi.getCourses(credentials),
      amizoneApi.getWifiMacInfo(credentials)
        .catch(() => null)
        .then(async (wifiMac) => {
          if (wifiMac) return wifiMac;
          const legacy = await amizoneApi.getWifiInfo(credentials).catch(() => null);
          return normalizeWifiMac(legacy);
        }),
      amizoneApi.getExamSchedule(credentials).catch(() => null),
    ]);

    setState((prev) => ({
      ...prev,
      profile: results[0].status === "fulfilled" ? results[0].value : null,
      profileError: results[0].status === "fulfilled" ? null : (results[0].reason?.message || "Failed to load profile"),
      attendance: results[1].status === "fulfilled" ? results[1].value : null,
      attendanceError: results[1].status === "fulfilled" ? null : (results[1].reason?.message || "Failed to load attendance"),
      schedule: results[2].status === "fulfilled" ? results[2].value : null,
      scheduleError: results[2].status === "fulfilled" ? null : (results[2].reason?.message || "Failed to load schedule"),
      courses: results[3].status === "fulfilled" ? results[3].value : null,
      coursesError: results[3].status === "fulfilled" ? null : (results[3].reason?.message || "Failed to load courses"),
      coursesLoading: false,
      coursesSemesterRef: null,
      wifiMac: results[4].status === "fulfilled" ? results[4].value : null,
      examSchedule: results[5].status === "fulfilled" ? results[5].value : null,
      loading: false,
    }));
  }, [router]);

  useEffect(() => {
    fetchCoreData();
  }, [fetchCoreData]);

  useEffect(() => {
    if (state.activeTab === "results") {
      void ensureSemestersLoaded();
      void ensureResultsLoaded();
    }
  }, [state.activeTab]);

  const ensureSemestersLoaded = async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setState((prev) => {
      if (prev.results.semesters) return prev;
      return { ...prev, results: { ...prev.results, error: null } };
    });

    try {
      const semesters = await amizoneApi.getSemesters(credentials);
      setState((prev) => ({ ...prev, results: { ...prev.results, semesters } }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, error: getErrorMessage(e, "Failed to load semesters") },
      }));
    }
  };

  const ensureResultsLoaded = async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setState((prev) => {
      if (prev.results.loading || prev.results.data) return prev;
      return { ...prev, results: { ...prev.results, loading: true, error: null } };
    });

    try {
      const current = await amizoneApi.getCurrentExamResult(credentials);
      setState((prev) => ({ ...prev, results: { ...prev.results, data: current } }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, error: getErrorMessage(e, "Failed to load exam results") },
      }));
    } finally {
      setState((prev) => ({ ...prev, results: { ...prev.results, loading: false } }));
    }
  };

  const loadResultsForSemester = async (semesterRef: string | null) => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setState((prev) => ({
      ...prev,
      results: { ...prev.results, semesterRef, loading: true, error: null, data: null },
    }));

    try {
      const data = semesterRef
        ? await amizoneApi.getExamResult(credentials, semesterRef)
        : await amizoneApi.getCurrentExamResult(credentials);
      setState((prev) => ({ ...prev, results: { ...prev.results, data } }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        results: { ...prev.results, error: getErrorMessage(e, "Failed to load exam results") },
      }));
    } finally {
      setState((prev) => ({ ...prev, results: { ...prev.results, loading: false } }));
    }
  };

  const loadCoursesForSemester = async (semesterRef: string | null) => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setState((prev) => ({
      ...prev,
      coursesLoading: true,
      coursesError: null,
      coursesSemesterRef: semesterRef,
    }));

    try {
      const data = semesterRef
        ? await amizoneApi.getCoursesBySemester(credentials, semesterRef)
        : await amizoneApi.getCourses(credentials);
      setState((prev) => ({ ...prev, courses: data }));
    } catch (e) {
      setState((prev) => ({ ...prev, coursesError: getErrorMessage(e, "Failed to load courses") }));
    } finally {
      setState((prev) => ({ ...prev, coursesLoading: false }));
    }
  };

  const refreshWifiMac = async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setState((prev) => ({ ...prev, wifi: { ...prev.wifi, loading: true, error: null } }));
    try {
      const wifiMac = await amizoneApi.getWifiMacInfo(credentials);
      setState((prev) => ({ ...prev, wifiMac, wifi: { ...prev.wifi, loading: false } }));
    } catch (e) {
      setState((prev) => ({
        ...prev,
        wifi: { ...prev.wifi, loading: false, error: getErrorMessage(e, "Failed to refresh Wi‑Fi MAC info") },
      }));
    }
  };

  const handleAddWifiMac = async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    const address = normalizeMacAddress(state.wifi.address);
    if (!address) {
      toast.error("Enter a valid MAC address");
      return;
    }

    setState((prev) => ({ ...prev, wifi: { ...prev.wifi, loading: true, error: null } }));
    try {
      await amizoneApi.registerWifiMac(credentials, address, state.wifi.overrideLimit);
      toast.success("Wi‑Fi MAC added");
      setState((prev) => ({ ...prev, wifi: { ...prev.wifi, address: "", overrideLimit: false } }));
      await refreshWifiMac();
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to add MAC"));
      setState((prev) => ({
        ...prev,
        wifi: { ...prev.wifi, loading: false, error: getErrorMessage(e, "Failed to add MAC") },
      }));
    }
  };

  const handleRemoveWifiMac = async (address: string) => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setState((prev) => ({ ...prev, wifi: { ...prev.wifi, loading: true, error: null } }));
    try {
      await amizoneApi.deregisterWifiMac(credentials, address);
      toast.success("Wi‑Fi MAC removed");
      await refreshWifiMac();
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to remove MAC"));
      setState((prev) => ({
        ...prev,
        wifi: { ...prev.wifi, loading: false, error: getErrorMessage(e, "Failed to remove MAC") },
      }));
    }
  };

  const handleSubmitFeedback = async () => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    setState((prev) => ({ ...prev, feedback: { ...prev.feedback, loading: true, error: null, filledFor: null } }));
    try {
      const res = await amizoneApi.submitFacultyFeedback(credentials, {
        rating: state.feedback.rating,
        queryRating: state.feedback.queryRating,
        comment: state.feedback.comment,
      });
      toast.success("Feedback submitted");
      setState((prev) => ({ ...prev, feedback: { ...prev.feedback, filledFor: res.filledFor } }));
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to submit feedback"));
      setState((prev) => ({
        ...prev,
        feedback: { ...prev.feedback, error: getErrorMessage(e, "Failed to submit feedback") },
      }));
    } finally {
      setState((prev) => ({ ...prev, feedback: { ...prev.feedback, loading: false } }));
    }
  };

  if (state.loading) {
    return <DashboardSkeleton />;
  }

  const allFailed = !state.profile && !state.attendance && !state.schedule && !state.courses;
  const examItems = state.examSchedule ? normalizeExamItems(state.examSchedule) : [];

  if (allFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Failed to load data</CardTitle>
            <CardDescription>
              We could not reach the Amizone API. This might be due to incorrect credentials or the server being down.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={fetchCoreData} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallPercentage = state.attendance ? calculateOverallAttendance(state.attendance.records) : 0;

  const handleLogout = () => {
    localStorage.removeItem("amizone_user");
    localStorage.removeItem("amizone_pass");
    router.push("/api/auth/logout");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-6xl mx-auto items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter">Amizoo</span>
          </div>
          <div className="flex items-center gap-4">
            {state.profile ? (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold">{state.profile.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{state.profile.enrollmentNumber}</span>
              </div>
            ) : (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-muted-foreground">Profile unavailable</span>
              </div>
            )}
            <Button variant="outline" size="icon" className="rounded-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {state.attendance ? (
            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Overall Attendance</CardDescription>
                <CardTitle className="text-4xl font-black flex items-baseline gap-2">
                  {overallPercentage}%
                  <span className="text-sm font-medium text-muted-foreground">average</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getOverallAttendanceBg(state.attendance.records)}`}
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <ErrorCard title="Attendance" error={state.attendanceError} onRetry={fetchCoreData} />
          )}

          {state.profile ? (
            <Card className="bg-card border-border shadow-sm md:col-span-2">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Academic Profile</CardDescription>
                <CardTitle className="text-lg font-bold truncate">{state.profile.program}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-x-8 gap-y-2">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Batch</p>
                  <p className="text-sm font-medium">{state.profile.batch}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Blood Group</p>
                  <p className="text-sm font-medium">{state.profile.bloodGroup}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">ID Card</p>
                  <p className="text-sm font-medium">{state.profile.idCardNumber}</p>
                </div>
                {state.wifiMac?.addresses?.[0] && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1">
                      <Wifi className="h-2.5 w-2.5" /> Wi-Fi MAC
                    </p>
                    <p className="text-sm font-medium tabular-nums">{state.wifiMac.addresses[0]}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <ErrorCard className="md:col-span-2" title="Profile" error={state.profileError} onRetry={fetchCoreData} />
          )}
        </div>

        <Tabs
          value={state.activeTab}
          onValueChange={(value) => setState((prev) => ({ ...prev, activeTab: value as DashboardTab }))}
          className="space-y-6"
        >
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="schedule" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-6">
              <Calendar className="h-3.5 w-3.5" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-6">
              <BarChart3 className="h-3.5 w-3.5" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-6">
              <GraduationCap className="h-3.5 w-3.5" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-6">
              <FileText className="h-3.5 w-3.5" />
              Exams
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-6">
              <Award className="h-3.5 w-3.5" />
              Results
            </TabsTrigger>
            <TabsTrigger value="wifi" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-6">
              <Wifi className="h-3.5 w-3.5" />
              Wi-Fi
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2 font-bold uppercase text-[10px] tracking-widest px-6">
              <MessageSquareText className="h-3.5 w-3.5" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tight">Today&apos;s Classes</h2>
              <Badge variant="secondary" className="font-bold rounded-full px-4 py-1 text-[10px] uppercase tracking-widest">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Badge>
            </div>
            {state.schedule ? (
              <Schedule schedule={state.schedule} />
            ) : (
              <ErrorCard title="Schedule" error={state.scheduleError} onRetry={fetchCoreData} />
            )}
          </TabsContent>

          <TabsContent value="attendance">
            {state.attendance ? (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xl font-black uppercase tracking-tight">Attendance Breakdown</CardTitle>
                  <CardDescription>Detailed statistics per course for current semester</CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b">
                        <TableHead className="w-[40%] font-bold uppercase text-[10px] tracking-widest px-6">Course</TableHead>
                        <TableHead className="font-bold uppercase text-[10px] tracking-widest">Ratio</TableHead>
                        <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest px-6">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {state.attendance.records.map((record) => (
                        <TableRow key={record.course.code} className="group transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="font-bold group-hover:text-primary transition-colors">{record.course.name}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{record.course.code}</div>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
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
                </CardContent>
              </Card>
            ) : (
              <ErrorCard title="Attendance" error={state.attendanceError} onRetry={fetchCoreData} />
            )}
          </TabsContent>

          <TabsContent value="courses">
            {state.courses ? (
              <div className="space-y-6">
                <Card className="border-border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Semester</CardTitle>
                    <CardDescription>Switch semesters to view older courses.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={state.coursesSemesterRef === null ? "default" : "outline"}
                      onClick={() => void loadCoursesForSemester(null)}
                      disabled={state.coursesLoading}
                      className="font-bold uppercase text-[10px] tracking-widest"
                    >
                      Current
                    </Button>
                    {(state.results.semesters?.semesters || []).map((s) => (
                      <Button
                        key={s.ref}
                        size="sm"
                        variant={state.coursesSemesterRef === s.ref ? "default" : "outline"}
                        onClick={() => void loadCoursesForSemester(s.ref)}
                        disabled={state.coursesLoading}
                        className="font-bold uppercase text-[10px] tracking-widest"
                      >
                        {s.name}
                      </Button>
                    ))}
                    {!state.results.semesters && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void ensureSemestersLoaded()}
                        disabled={state.coursesLoading}
                        className="font-bold uppercase text-[10px] tracking-widest"
                      >
                        Load Semesters
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void loadCoursesForSemester(state.coursesSemesterRef)}
                      disabled={state.coursesLoading}
                      className="font-bold uppercase text-[10px] tracking-widest"
                    >
                      <RefreshCw className={`mr-2 h-3 w-3 ${state.coursesLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {state.courses.courses.map((course) => (
                    <Card key={course.ref.code} className="group border-border hover:border-secondary transition-all shadow-sm">
                      <CardHeader>
                        <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                          {course.type}
                        </CardDescription>
                        <CardTitle className="text-lg font-bold group-hover:text-secondary-foreground transition-colors leading-tight">
                          {course.ref.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
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
                            <span className="text-primary">
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
              </div>
            ) : (
              <ErrorCard title="Courses" error={state.coursesError} onRetry={fetchCoreData} />
            )}
          </TabsContent>
          <TabsContent value="exams" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tight">Exam Schedule</h2>
            </div>
            {state.examSchedule && examItems.length > 0 ? (
              <div className="grid gap-4">
                {examItems.map((exam, i) => (
                  <Card key={i} className="overflow-hidden border-border bg-card shadow-sm">
                    <CardContent className="p-6 flex justify-between items-center">
                      <div>
                        <h4 className="font-black text-primary uppercase tracking-tight">{exam.course.name}</h4>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{exam.course.code}</p>
                        {(exam.mode || exam.location) && (
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                            {[exam.mode, exam.location].filter(Boolean).join(" • ")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-primary">{exam.dateLabel}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">{exam.timeLabel}</div>
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
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Exam Results</h2>
                <p className="text-sm text-muted-foreground">Current semester by default; pick a semester to view older results.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => loadResultsForSemester(state.results.semesterRef)}
                disabled={state.results.loading}
                className="font-bold uppercase text-[10px] tracking-widest"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {state.results.error && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive text-sm">Results unavailable</CardTitle>
                  <CardDescription className="text-xs">{state.results.error}</CardDescription>
                </CardHeader>
              </Card>
            )}

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Semester</CardTitle>
                <CardDescription>Select which semester’s results to load.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={state.results.semesterRef === null ? "default" : "outline"}
                  onClick={() => void loadResultsForSemester(null)}
                  disabled={state.results.loading}
                  className="font-bold uppercase text-[10px] tracking-widest"
                >
                  Current
                </Button>
                {state.results.semesters?.semesters?.map((s) => (
                  <Button
                    key={s.ref}
                    size="sm"
                    variant={state.results.semesterRef === s.ref ? "default" : "outline"}
                    onClick={() => void loadResultsForSemester(s.ref)}
                    disabled={state.results.loading}
                    className="font-bold uppercase text-[10px] tracking-widest"
                  >
                    {s.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {state.results.loading && (
              <Card className="border-dashed">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Loading results…</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {state.results.data && (
              <div className="space-y-6">
                {state.results.data.overall?.length > 0 && (
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Overall</CardTitle>
                      <CardDescription>SGPA / CGPA summary per semester</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 pt-6">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest px-6">Semester</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest">SGPA</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest">CGPA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {state.results.data.overall.map((row) => (
                            <TableRow key={row.semester.semesterRef}>
                              <TableCell className="px-6 py-4 font-bold">{row.semester.semesterRef}</TableCell>
                              <TableCell className="py-4 font-medium tabular-nums">{row.semesterGradePointAverage.toFixed(2)}</TableCell>
                              <TableCell className="py-4 font-medium tabular-nums">{row.cumulativeGradePointAverage.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {state.results.data.courseWise?.length > 0 ? (
                  <Card className="border-border shadow-sm">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-xl font-black uppercase tracking-tight">Course-wise</CardTitle>
                      <CardDescription>Grades and credits per course</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 pt-6">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b">
                            <TableHead className="w-[45%] font-bold uppercase text-[10px] tracking-widest px-6">Course</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest">Grade</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest">Points</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest">Credits</TableHead>
                            <TableHead className="font-bold uppercase text-[10px] tracking-widest px-6 text-right">Published</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {state.results.data.courseWise.map((r) => (
                            <TableRow key={r.course.code} className="group transition-colors">
                              <TableCell className="px-6 py-4">
                                <div className="font-bold group-hover:text-primary transition-colors">{r.course.name}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{r.course.code}</div>
                              </TableCell>
                              <TableCell className="py-4">
                                <Badge variant="outline" className="font-black tabular-nums border-2">
                                  {r.score.grade} ({r.score.gradePoint})
                                </Badge>
                              </TableCell>
                              <TableCell className="py-4 font-medium tabular-nums">{r.credits.points}</TableCell>
                              <TableCell className="py-4 font-medium tabular-nums">
                                {r.credits.acquired}/{r.credits.effective}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
          </TabsContent>

          <TabsContent value="wifi" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Wi‑Fi MAC Addresses</h2>
                <p className="text-sm text-muted-foreground">Manage your registered devices.</p>
              </div>
              <Button
                variant="outline"
                onClick={refreshWifiMac}
                disabled={state.wifi.loading}
                className="font-bold uppercase text-[10px] tracking-widest"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${state.wifi.loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {state.wifi.error && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive text-sm">Wi‑Fi unavailable</CardTitle>
                  <CardDescription className="text-xs">{state.wifi.error}</CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Slots</CardDescription>
                  <CardTitle className="text-3xl font-black tabular-nums">{state.wifiMac?.slots ?? "—"}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Free Slots</CardDescription>
                  <CardTitle className="text-3xl font-black tabular-nums">{state.wifiMac?.freeSlots ?? "—"}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-card border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Registered</CardDescription>
                  <CardTitle className="text-3xl font-black tabular-nums">{state.wifiMac?.addresses?.length ?? 0}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Add MAC</CardTitle>
                <CardDescription>Enter a device MAC address to register.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-3">
                <Input
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={state.wifi.address}
                  onChange={(e) => setState((prev) => ({ ...prev, wifi: { ...prev.wifi, address: e.target.value } }))}
                />
                <Button
                  type="button"
                  variant={state.wifi.overrideLimit ? "default" : "outline"}
                  onClick={() => setState((prev) => ({ ...prev, wifi: { ...prev.wifi, overrideLimit: !prev.wifi.overrideLimit } }))}
                  className="font-bold uppercase text-[10px] tracking-widest"
                >
                  Override Limit
                </Button>
                <Button
                  type="button"
                  onClick={handleAddWifiMac}
                  disabled={state.wifi.loading}
                  className="font-bold uppercase text-[10px] tracking-widest"
                >
                  Add
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-0">
                <CardTitle className="text-xl font-black uppercase tracking-tight">Registered MACs</CardTitle>
                <CardDescription>Remove old devices to free up slots.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pt-6">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="font-bold uppercase text-[10px] tracking-widest px-6">Address</TableHead>
                      <TableHead className="font-bold uppercase text-[10px] tracking-widest px-6 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.wifiMac?.addresses?.length ? (
                      state.wifiMac.addresses.map((addr) => (
                        <TableRow key={addr}>
                          <TableCell className="px-6 py-4 font-medium tabular-nums">{addr}</TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleRemoveWifiMac(addr)}
                              disabled={state.wifi.loading}
                              className="text-xs"
                            >
                              <Trash2 className="mr-2 h-3 w-3" /> Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="px-6 py-8 text-center text-sm text-muted-foreground">
                          No MAC addresses found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">Faculty Feedback</h2>
                <p className="text-sm text-muted-foreground">Submits the same rating for all faculty (server behavior).</p>
              </div>
              <Button
                onClick={handleSubmitFeedback}
                disabled={state.feedback.loading}
                className="font-bold uppercase text-[10px] tracking-widest"
              >
                {state.feedback.loading ? "Submitting…" : "Submit"}
              </Button>
            </div>

            {state.feedback.error && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-destructive text-sm">Submission failed</CardTitle>
                  <CardDescription className="text-xs">{state.feedback.error}</CardDescription>
                </CardHeader>
              </Card>
            )}

            {state.feedback.filledFor !== null && (
              <Card className="border-border bg-secondary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase tracking-widest">Submitted</CardTitle>
                  <CardDescription className="text-xs">
                    Feedback filled for <span className="font-bold tabular-nums">{state.feedback.filledFor}</span> faculty members.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest">Ratings</CardTitle>
                <CardDescription>Choose the values to submit.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Faculty rating (1–5)</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        variant={state.feedback.rating === n ? "default" : "outline"}
                        onClick={() => setState((prev) => ({ ...prev, feedback: { ...prev.feedback, rating: n } }))}
                        className="font-bold uppercase text-[10px] tracking-widest tabular-nums"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Query rating (1–3)</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((n) => (
                      <Button
                        key={n}
                        size="sm"
                        variant={state.feedback.queryRating === n ? "default" : "outline"}
                        onClick={() => setState((prev) => ({ ...prev, feedback: { ...prev.feedback, queryRating: n } }))}
                        className="font-bold uppercase text-[10px] tracking-widest tabular-nums"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Comment</p>
                  <Textarea
                    placeholder="Optional comment…"
                    value={state.feedback.comment}
                    onChange={(e) => setState((prev) => ({ ...prev, feedback: { ...prev.feedback, comment: e.target.value } }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="container max-w-6xl mx-auto py-12 px-8 text-center text-muted-foreground">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">
          Amizoo &bull; 60/30/10 Beige & Burlywood
        </p>
      </footer>
    </div>
  );
}

function calculatePercentage(attendance: { attended: number; held: number }) {
  if (attendance.held === 0) return 100;
  return Math.round((attendance.attended / attendance.held) * 100);
}

function calculateOverallAttendance(records: AttendanceRecord[]) {
  const totalAttended = records.reduce((acc, r) => acc + r.attendance.attended, 0);
  const totalHeld = records.reduce((acc, r) => acc + r.attendance.held, 0);
  if (totalHeld === 0) return 100;
  return Math.round((totalAttended / totalHeld) * 100);
}

function getAttendanceColor(attendance: { attended: number; held: number }) {
  const percentage = calculatePercentage(attendance);
  if (percentage >= 75) return "text-primary border-primary";
  if (percentage >= 60) return "text-secondary-foreground border-secondary";
  return "text-destructive border-destructive";
}

function getOverallAttendanceBg(records: AttendanceRecord[]) {
  const percentage = calculateOverallAttendance(records);
  if (percentage >= 75) return "bg-primary";
  if (percentage >= 60) return "bg-secondary";
  return "bg-destructive";
}

function ErrorCard({
  title,
  error,
  onRetry,
  className
}: {
  title: string;
  error: string | null;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <Card className={`border-destructive/20 bg-destructive/5 ${className || ""}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-destructive text-sm">{title} Unavailable</CardTitle>
        <CardDescription className="text-xs">
          {error || "Failed to load data"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={onRetry} variant="outline" size="sm" className="text-xs">
          <RefreshCw className="mr-2 h-3 w-3" /> Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-8 container max-w-6xl mx-auto">
      <div className="flex justify-between items-center h-16">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full md:col-span-2" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

function getErrorMessage(err: unknown, fallback: string) {
  if (!err) return fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  return fallback;
}

function normalizeWifiMac(legacy: WifiInfo | null): WifiMacInfo | null {
  if (!legacy?.macAddress) return null;
  return { addresses: [legacy.macAddress], slots: 0, freeSlots: 0 };
}

function normalizeMacAddress(raw: string) {
  const cleaned = raw.trim().replace(/-/g, ":").toUpperCase();
  const ok = /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(cleaned);
  return ok ? cleaned : null;
}

type NormalizedExamItem = {
  course: CourseRef;
  mode?: string;
  location?: string;
  dateLabel: string;
  timeLabel: string;
};

function normalizeExamItems(raw: unknown): NormalizedExamItem[] {
  if (!isRecord(raw)) return [];
  const examsValue = raw.exams;
  if (!Array.isArray(examsValue)) return [];

  const items: NormalizedExamItem[] = [];
  for (const exam of examsValue) {
    if (!isRecord(exam)) continue;
    const course = asCourseRef(exam.course);
    if (!course) continue;

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
    items.push({ course, mode, location, dateLabel, timeLabel });
  }

  return items;
}

function formatTypeDate(d: { year: number; month: number; day: number } | undefined) {
  if (!d?.year || !d?.month || !d?.day) return "—";
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day));
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asCourseRef(value: unknown): CourseRef | null {
  if (!isRecord(value)) return null;
  const code = value.code;
  const name = value.name;
  if (typeof code !== "string" || typeof name !== "string") return null;
  return { code, name };
}
