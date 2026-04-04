"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { amizoneApi, amizoneCache, getLocalCredentials } from "@/lib/api";
import { Profile, AttendanceRecords, ScheduledClasses, WifiMacInfo } from "@/lib/types";
import { useRouter } from "next/navigation";
import { formatISODateInIST } from "@/lib/date-utils";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

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

  useIsomorphicLayoutEffect(() => {
    const credentials = getLocalCredentials();
    if (!credentials) return;

    const today = formatISODateInIST(new Date());
    const cachedProfile = amizoneCache.getProfile(credentials);
    const cachedAttendance = amizoneCache.getAttendance(credentials);
    const cachedSchedule = amizoneCache.getClassSchedule(today, credentials);
    const cachedWifiMac =
      amizoneCache.getWifiMacInfo(credentials) ??
      (() => {
        const legacy = amizoneCache.getWifiInfo(credentials);
        if (!legacy?.macAddress) return null;
        return {
          addresses: [legacy.macAddress],
          slots: 0,
          freeSlots: 0,
        } satisfies WifiMacInfo;
      })();

    const hasCachedData = Boolean(
      cachedProfile || cachedAttendance || cachedSchedule || cachedWifiMac
    );

    if (!hasCachedData) return;

    setProfile((current) => current ?? cachedProfile);
    setAttendance((current) => current ?? cachedAttendance);
    setSchedule((current) => current ?? cachedSchedule);
    setWifiMac((current) => current ?? cachedWifiMac);
    setLoading(false);
  }, []);

  const fetchData = useCallback(async ({ fresh }: { fresh?: boolean } = {}) => {
    const credentials = getLocalCredentials();
    if (!credentials) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    const today = formatISODateInIST(new Date());
    const init = fresh ? ({ cache: "no-store" } as const) : undefined;

    try {
      const [p, a, s, w] = await Promise.all([
        amizoneApi.getProfile(credentials, init).catch(() => null),
        amizoneApi.getAttendance(credentials, init).catch(() => null),
        amizoneApi.getClassSchedule(credentials, today, fresh ? { fresh: true } : undefined).catch(() => null),
        amizoneApi.getWifiMacInfo(credentials, init).catch(async () => {
            const legacy = await amizoneApi.getWifiInfo(credentials, init).catch(() => null);
            if (legacy?.macAddress) return { addresses: [legacy.macAddress], slots: 0, freeSlots: 0 };
            return null;
        }),
      ]);

      if (p) setProfile(p);
      if (a) setAttendance(a);
      if (s) setSchedule(s);
      if (w) setWifiMac(w);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData({ fresh: false });
  }, [fetchData]);

  return (
    <DashboardContext.Provider value={{ profile, attendance, schedule, wifiMac, loading, refresh: () => fetchData({ fresh: true }), error }}>
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
