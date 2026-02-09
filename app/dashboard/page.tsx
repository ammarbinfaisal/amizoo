"use client";

import { useEffect, useState } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Schedule } from "@/components/Schedule";
import { AttendanceRecord, AttendanceRecords, Courses, ExamSchedule, Profile, ScheduledClasses, WifiInfo } from "@/lib/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Calendar, GraduationCap, BarChart3, RefreshCw, Wifi, FileText } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRecords | null>(null);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<ScheduledClasses | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const [courses, setCourses] = useState<Courses | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const [wifi, setWifi] = useState<WifiInfo | null>(null);
  const [exams, setExams] = useState<ExamSchedule | null>(null);

  const fetchData = async () => {
    const credentials = getLocalCredentials();

    if (!credentials) {
      router.push("/login");
      return;
    }

    setLoading(true);

    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.allSettled([
      amizoneApi.getProfile(credentials),
      amizoneApi.getAttendance(credentials),
      amizoneApi.getClassSchedule(credentials, today),
      amizoneApi.getCourses(credentials),
      amizoneApi.getWifiInfo(credentials).catch(() => null),
      amizoneApi.getExamSchedule(credentials).catch(() => null),
    ]);

    if (results[0].status === "fulfilled") {
      setProfile(results[0].value);
      setProfileError(null);
    } else {
      setProfileError(results[0].reason?.message || "Failed to load profile");
    }

    if (results[1].status === "fulfilled") {
      setAttendance(results[1].value);
      setAttendanceError(null);
    } else {
      setAttendanceError(results[1].reason?.message || "Failed to load attendance");
    }

    if (results[2].status === "fulfilled") {
      setSchedule(results[2].value);
      setScheduleError(null);
    } else {
      setScheduleError(results[2].reason?.message || "Failed to load schedule");
    }

    if (results[3].status === "fulfilled") {
      setCourses(results[3].value);
      setCoursesError(null);
    } else {
      setCoursesError(results[3].reason?.message || "Failed to load courses");
    }

    if (results[4].status === "fulfilled") {
      setWifi(results[4].value);
    }

    if (results[5].status === "fulfilled") {
      setExams(results[5].value);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const allFailed = !profile && !attendance && !schedule && !courses;

  if (allFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Failed to load data</CardTitle>
            <CardDescription>
              We couldn't reach the Amizone API. This might be due to incorrect credentials or the server being down.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={fetchData} className="w-full">
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

  const overallPercentage = attendance ? calculateOverallAttendance(attendance.records) : 0;

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
            {profile ? (
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold">{profile.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{profile.enrollmentNumber}</span>
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
          {attendance ? (
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
                    className={`h-full transition-all ${getOverallAttendanceBg(attendance.records)}`}
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <ErrorCard title="Attendance" error={attendanceError} onRetry={fetchData} />
          )}

          {profile ? (
            <Card className="bg-card border-border shadow-sm md:col-span-2">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Academic Profile</CardDescription>
                <CardTitle className="text-lg font-bold truncate">{profile.program}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-x-8 gap-y-2">
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Batch</p>
                  <p className="text-sm font-medium">{profile.batch}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Blood Group</p>
                  <p className="text-sm font-medium">{profile.bloodGroup}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">ID Card</p>
                  <p className="text-sm font-medium">{profile.idCardNumber}</p>
                </div>
                {wifi && (
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1">
                      <Wifi className="h-2.5 w-2.5" /> Wi-Fi MAC
                    </p>
                    <p className="text-sm font-medium tabular-nums">{wifi.macAddress}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <ErrorCard className="md:col-span-2" title="Profile" error={profileError} onRetry={fetchData} />
          )}
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
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
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tight">Today&apos;s Classes</h2>
              <Badge variant="secondary" className="font-bold rounded-full px-4 py-1 text-[10px] uppercase tracking-widest">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Badge>
            </div>
            {schedule ? (
              <Schedule schedule={schedule} />
            ) : (
              <ErrorCard title="Schedule" error={scheduleError} onRetry={fetchData} />
            )}
          </TabsContent>

          <TabsContent value="attendance">
            {attendance ? (
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
                      {attendance.records.map((record) => (
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
              <ErrorCard title="Attendance" error={attendanceError} onRetry={fetchData} />
            )}
          </TabsContent>

          <TabsContent value="courses">
            {courses ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.courses.map((course) => (
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
            ) : (
              <ErrorCard title="Courses" error={coursesError} onRetry={fetchData} />
            )}
          </TabsContent>
          <TabsContent value="exams" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tight">Exam Schedule</h2>
            </div>
            {exams && exams.exams.length > 0 ? (
              <div className="grid gap-4">
                {exams.exams.map((exam, i) => (
                  <Card key={i} className="overflow-hidden border-border bg-card shadow-sm">
                    <CardContent className="p-6 flex justify-between items-center">
                      <div>
                        <h4 className="font-black text-primary uppercase tracking-tight">{exam.course.name}</h4>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{exam.course.code}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-primary">{exam.date}</div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase">{exam.time}</div>
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
