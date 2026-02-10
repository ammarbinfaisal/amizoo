"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { amizoneApi, getLocalCredentials } from "@/lib/api";
import { Profile, AttendanceRecords, ScheduledClasses, WifiMacInfo } from "@/lib/types";
import { useRouter } from "next/navigation";

interface DashboardContextType {
  profile: Profile | null;
  attendance: AttendanceRecords | null;
  schedule: ScheduledClasses | null;
  wifiMac: WifiMacInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  error: string | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecords | null>(null);
  const [schedule, setSchedule] = useState<ScheduledClasses | null>(null);
  const [wifiMac, setWifiMac] = useState<WifiMacInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    const credentials = getLocalCredentials();
    if (!credentials) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split("T")[0];

    try {
      const [p, a, s, w] = await Promise.all([
        amizoneApi.getProfile(credentials).catch(() => null),
        amizoneApi.getAttendance(credentials).catch(() => null),
        amizoneApi.getClassSchedule(credentials, today).catch(() => null),
        amizoneApi.getWifiMacInfo(credentials).catch(async () => {
            const legacy = await amizoneApi.getWifiInfo(credentials).catch(() => null);
            if (legacy?.macAddress) return { addresses: [legacy.macAddress], slots: 0, freeSlots: 0 };
            return null;
        }),
      ]);

      setProfile(p);
      setAttendance(a);
      setSchedule(s);
      setWifiMac(w);
    } catch (e) {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DashboardContext.Provider value={{ profile, attendance, schedule, wifiMac, loading, refresh: fetchData, error }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
