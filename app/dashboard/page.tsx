import { getAuthCredentials } from "@/lib/auth";
import { amizoneApi } from "@/lib/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Schedule } from "@/components/Schedule";
import { AttendanceRecord } from "@/lib/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LogOut, Calendar, GraduationCap, BarChart3 } from "lucide-react";

export default async function DashboardPage() {
  const credentials = await getAuthCredentials();

  if (!credentials) {
    redirect("/login");
  }

  const today = new Date().toISOString().split("T")[0];

  let profile, attendance, schedule, courses;
  try {
    [profile, attendance, schedule, courses] = await Promise.all([
      amizoneApi.getProfile(credentials),
      amizoneApi.getAttendance(credentials),
      amizoneApi.getClassSchedule(credentials, today),
      amizoneApi.getCourses(credentials),
    ]);
  } catch (err) {
    console.error(err);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Failed to load data</CardTitle>
            <CardDescription>
              We couldn&apos;t reach the Amizone API. This might be due to incorrect credentials or the server being down.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/login">Try Logging In Again</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/api/auth/logout">Logout</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallPercentage = calculateOverallAttendance(attendance.records);

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
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-bold">{profile.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{profile.enrollmentNumber}</span>
            </div>
            <Button asChild variant="outline" size="icon" className="rounded-full">
              <Link href="/api/auth/logout">
                <LogOut className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </CardContent>
          </Card>
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
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tight">Today&apos;s Classes</h2>
              <Badge variant="outline" className="font-bold border-secondary text-secondary-foreground bg-secondary/10">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Badge>
            </div>
            <Schedule schedule={schedule} />
          </TabsContent>

          <TabsContent value="attendance">
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
          </TabsContent>

          <TabsContent value="courses">
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
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                      <span>{course.ref.code}</span>
                      <div className="flex items-center gap-2">
                         <span className={getAttendanceColor(course.attendance)}>
                           {calculatePercentage(course.attendance)}% Att.
                         </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="container max-w-6xl mx-auto py-12 px-8 text-center text-muted-foreground">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">
          Amizoo &bull; Crafted with Burlywood & Black
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
