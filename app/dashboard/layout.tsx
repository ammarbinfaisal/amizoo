"use client";

import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { DesktopNav, MobileNav, TabNav } from "@/components/Navigation";
import { GraduationCap, LogOut, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

export default function DashboardLayout({
  tabs,
}: {
  tabs: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-background text-foreground font-sans pb-20 lg:pb-0">
        <DashboardHeader />
        
        <main className="container max-w-7xl mx-auto p-4 md:p-8 lg:flex lg:gap-8">
          <div className="hidden lg:flex flex-col gap-6 w-80 shrink-0">
            <DesktopNav />
            <div className="space-y-6">
              <QuickStats />
            </div>
          </div>
          
          <div className="flex-grow space-y-8 min-w-0">
            <div className="lg:hidden">
              <TabNav />
            </div>
            <div className="min-h-[400px]">
                {tabs}
            </div>
          </div>
        </main>

        <MobileNav />
        
        <footer className="hidden lg:block container max-w-7xl mx-auto py-12 px-8 text-center text-muted-foreground">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">
            Amizoo &bull; 60/30/10 Beige & Burlywood
          </p>
        </footer>
      </div>
    </DashboardProvider>
  );
}

function DashboardHeader() {
  const { profile, loading } = useDashboard();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("amizone_user");
    localStorage.removeItem("amizone_pass");
    router.push("/api/auth/logout");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-xl font-black uppercase tracking-tighter">Amizoo</span>
        </div>
        
        <div className="flex items-center gap-4">
          {loading ? (
            <Skeleton className="h-8 w-32 hidden md:block" />
          ) : profile ? (
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-bold">{profile.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{profile.enrollmentNumber}</span>
            </div>
          ) : null}
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function QuickStats() {
  const { attendance, profile, wifiMac, loading, error } = useDashboard();

  if (loading && !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !profile) {
      return null;
  }

  const overallPercentage = attendance ? calculateOverallAttendance(attendance.records) : 0;

  return (
    <div className="flex flex-col gap-6">
      {attendance && (
        <Card className="bg-card border-border shadow-sm overflow-hidden group">
          <CardHeader className="pb-2 p-6">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Overall Attendance</CardDescription>
            <CardTitle className="text-4xl font-black flex items-baseline gap-2">
              {overallPercentage}%
              <span className="text-sm font-medium text-muted-foreground">average</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${getOverallAttendanceBg(attendance.records)}`}
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {profile && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2 p-6">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Academic Profile</CardDescription>
            <CardTitle className="text-base font-bold leading-tight">{profile.program}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6 pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Batch</p>
                <p className="text-xs font-medium">{profile.batch}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Blood</p>
                <p className="text-xs font-medium">{profile.bloodGroup}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">ID Card</p>
                <p className="text-xs font-medium tabular-nums">{profile.idCardNumber}</p>
              </div>
              {wifiMac?.addresses?.[0] && (
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider flex items-center gap-1">
                    <Wifi className="h-2.5 w-2.5" /> Wi-Fi MAC
                  </p>
                  <p className="text-xs font-medium tabular-nums truncate">{wifiMac.addresses[0]}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function calculateOverallAttendance(records: any[]) {
  const totalAttended = records.reduce((acc, r) => acc + r.attendance.attended, 0);
  const totalHeld = records.reduce((acc, r) => acc + r.attendance.held, 0);
  if (totalHeld === 0) return 100;
  return Math.round((totalAttended / totalHeld) * 100);
}

function getOverallAttendanceBg(records: any[]) {
  const percentage = calculateOverallAttendance(records);
  if (percentage >= 75) return "bg-primary";
  if (percentage >= 60) return "bg-secondary";
  return "bg-destructive";
}
