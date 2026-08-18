"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { amizoneApi, amizoneCache, getSessionUser, isUnauthorizedError } from "@/lib/api";
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
    if (!getSessionUser()) return;

    const today = formatISODateInIST(new Date());
    const cachedProfile = amizoneCache.getProfile();
    const cachedAttendance = amizoneCache.getAttendance();
    const cachedSchedule = amizoneCache.getClassSchedule(today);
    const cachedWifiMac =
      amizoneCache.getWifiMacInfo() ??
      (() => {
        const legacy = amizoneCache.getWifiInfo();
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
    if (!getSessionUser()) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    const today = formatISODateInIST(new Date());
    const opts = fresh ? { fresh: true } : undefined;

    // The session can be rejected upstream mid-flight; capture that so we bounce
    // to /login instead of rendering an empty dashboard.
    let unauthorized = false;
    const guard = (error: unknown) => {
      if (isUnauthorizedError(error)) unauthorized = true;
      return null;
    };

    try {
      const [p, a, s, w] = await Promise.all([
        amizoneApi.getProfile(opts).catch(guard),
        amizoneApi.getAttendance(opts).catch(guard),
        amizoneApi.getClassSchedule(today, opts).catch(guard),
        amizoneApi.getWifiMacInfo(opts).catch(async (error) => {
          if (isUnauthorizedError(error)) {
            unauthorized = true;
            return null;
          }
          const legacy = await amizoneApi.getWifiInfo(opts).catch(guard);
          if (legacy?.macAddress) return { addresses: [legacy.macAddress], slots: 0, freeSlots: 0 };
          return null;
        }),
      ]);

      if (unauthorized) {
        router.push("/login");
        return;
      }

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
