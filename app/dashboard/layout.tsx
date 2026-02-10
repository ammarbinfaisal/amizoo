"use client";

import { DashboardProvider, useDashboard } from "@/lib/dashboard-context";
import { DesktopNav, MobileNav, TabNav } from "@/components/Navigation";
import { GraduationCap, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
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
          <PWAInstallPrompt />
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function QuickStats() {
  return null;
}
