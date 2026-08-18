"use client";

import { TRPCClientError } from "@trpc/client";

import { trpc } from "./trpc/client";
import type {
  AttendanceRecords,
  Courses,
  ExamResultRecords,
  ExaminationSchedule,
  FillFacultyFeedbackRequest,
  FillFacultyFeedbackResponse,
  Profile,
  ScheduledClasses,
  SemesterList,
  WifiInfo,
  WifiMacInfo,
} from "./types";

/**
 * Client-side data access.
 *
 * Every call goes to this app's own tRPC router (`/api/trpc`), which holds the
 * Amizone credentials server-side and caches upstream responses. The browser no
 * longer sees the password at all — it only knows *who* is signed in, via the
 * `amizone_user` cookie.
 *
 * The localStorage layer below is purely an offline mirror for the PWA: it
 * answers reads when the device is offline or the network call fails.
 */

const CACHE_PREFIX = "amizoo:api-cache:v2";
const USER_COOKIE = "amizone_user";
const isBrowser = typeof window !== "undefined";

export interface FetchOptions {
  /** Bypass both the server cache and the local mirror. */
  fresh?: boolean;
}

/** Cache resource ids — must stay aligned with `server/trpc/routers/amizone.ts`. */
const resource = {
  profile: "profile",
  attendance: "attendance",
  semesters: "semesters",
  courses: (ref?: string) => (ref ? `courses:${ref}` : "courses"),
  classSchedule: (date: string) => `class_schedule:${date}`,
  examSchedule: "exam_schedule",
  examResult: (ref?: string) => (ref ? `exam_result:${ref}` : "exam_result"),
  wifiMac: "wifi_mac",
  wifiInfo: "wifi_mac_address",
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Username of the signed-in user, or null. Presence implies a session cookie. */
export function getSessionUser(): string | null {
  return readCookie(USER_COOKIE);
}

export function isUnauthorizedError(error: unknown): boolean {
  return (
    error instanceof TRPCClientError &&
    (error.data as { code?: string } | undefined)?.code === "UNAUTHORIZED"
  );
}

function cacheKey(user: string, key: string) {
  return `${CACHE_PREFIX}:${user}:${key}`;
}

function readCache<T>(key: string): { data: T; timestamp: number } | null {
  if (!isBrowser) return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { data: T; timestamp: number };
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore quota errors and keep the app responsive.
  }
}

function isNetworkError(error: unknown) {
  if (!isBrowser) return false;
  if (navigator.onLine === false) return true;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("Failed to fetch") || message.includes("NetworkError")
  );
}

/** Reads through the local offline mirror, then the network. */
async function withOfflineCache<T>(
  key: string,
  load: () => Promise<T>
): Promise<T> {
  const user = getSessionUser();
  const storageKey = user ? cacheKey(user, key) : null;

  if (storageKey && isBrowser && navigator.onLine === false) {
    const cachedValue = readCache<T>(storageKey);
    if (cachedValue) return cachedValue.data;
    throw new Error("Offline with no cached data available");
  }

  try {
    const data = await load();
    if (storageKey) writeCache(storageKey, data);
    return data;
  } catch (error) {
    if (storageKey && isNetworkError(error)) {
      const cachedValue = readCache<T>(storageKey);
      if (cachedValue) return cachedValue.data;
    }
    throw error;
  }
}

function readCached<T>(key: string): T | null {
  const user = getSessionUser();
  if (!user) return null;
  return readCache<T>(cacheKey(user, key))?.data ?? null;
}

export async function login(username: string, password: string) {
  return trpc.auth.login.mutate({ username, password });
}

export async function logout() {
  try {
    await trpc.auth.logout.mutate();
  } finally {
    await clearLocalCache();
  }
}

/** Drops the offline mirror. Called on sign-out so a shared device leaks nothing. */
export async function clearLocalCache() {
  if (!isBrowser) return;

  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) doomed.push(key);
    }
    doomed.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Nothing to do if storage is unavailable.
  }

  // The service worker also holds the authenticated tRPC GETs (see
  // runtimeCaching in next.config.ts); those must go too.
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("amizone-"))
          .map((name) => caches.delete(name))
      );
    }
  } catch {
    // Cache Storage is unavailable or blocked; nothing further to do.
  }
}

export const amizoneApi = {
  getProfile: (opts?: FetchOptions) =>
    withOfflineCache<Profile>(
      resource.profile,
      () => trpc.amizone.profile.query({ fresh: opts?.fresh })
    ),

  getAttendance: (opts?: FetchOptions) =>
    withOfflineCache<AttendanceRecords>(
      resource.attendance,
      () => trpc.amizone.attendance.query({ fresh: opts?.fresh })
    ),

  getSemesters: (opts?: FetchOptions) =>
    withOfflineCache<SemesterList>(
      resource.semesters,
      () => trpc.amizone.semesters.query({ fresh: opts?.fresh })
    ),

  getCourses: (opts?: FetchOptions) =>
    withOfflineCache<Courses>(
      resource.courses(),
      () => trpc.amizone.courses.query({ fresh: opts?.fresh })
    ),

  getCoursesBySemester: (semesterRef: string, opts?: FetchOptions) =>
    withOfflineCache<Courses>(
      resource.courses(semesterRef),
      () => trpc.amizone.courses.query({ semesterRef, fresh: opts?.fresh })
    ),

  getClassSchedule: (date: string, opts?: FetchOptions) =>
    withOfflineCache<ScheduledClasses>(
      resource.classSchedule(date),
      () => trpc.amizone.classSchedule.query({ date, fresh: opts?.fresh })
    ),

  getWifiInfo: (opts?: FetchOptions) =>
    withOfflineCache<WifiInfo>(
      resource.wifiInfo,
      () => trpc.amizone.wifiInfo.query({ fresh: opts?.fresh })
    ),

  getWifiMacInfo: (opts?: FetchOptions) =>
    withOfflineCache<WifiMacInfo>(
      resource.wifiMac,
      () => trpc.amizone.wifiMac.query({ fresh: opts?.fresh })
    ),

  getExamSchedule: (opts?: FetchOptions) =>
    withOfflineCache<ExaminationSchedule>(
      resource.examSchedule,
      () => trpc.amizone.examSchedule.query({ fresh: opts?.fresh })
    ),

  getExamResult: (semesterRef: string, opts?: FetchOptions) =>
    withOfflineCache<ExamResultRecords>(
      resource.examResult(semesterRef),
      () => trpc.amizone.examResult.query({ semesterRef, fresh: opts?.fresh })
    ),

  getCurrentExamResult: (opts?: FetchOptions) =>
    withOfflineCache<ExamResultRecords>(
      resource.examResult(),
      () => trpc.amizone.examResult.query({ fresh: opts?.fresh })
    ),

  registerWifiMac: (address: string, overrideLimit = false) =>
    trpc.amizone.registerWifiMac.mutate({ address, overrideLimit }),

  deregisterWifiMac: (address: string) =>
    trpc.amizone.deregisterWifiMac.mutate({ address }),

  submitFacultyFeedback: (
    payload: FillFacultyFeedbackRequest
  ): Promise<FillFacultyFeedbackResponse> =>
    trpc.amizone.submitFacultyFeedback.mutate(payload),
};

export const amizoneCache = {
  getProfile: () => readCached<Profile>(resource.profile),
  getAttendance: () => readCached<AttendanceRecords>(resource.attendance),
  getSemesters: () => readCached<SemesterList>(resource.semesters),
  getCourses: () => readCached<Courses>(resource.courses()),
  getCoursesBySemester: (semesterRef: string) =>
    readCached<Courses>(resource.courses(semesterRef)),
  getClassSchedule: (date: string) =>
    readCached<ScheduledClasses>(resource.classSchedule(date)),
  getWifiInfo: () => readCached<WifiInfo>(resource.wifiInfo),
  getWifiMacInfo: () => readCached<WifiMacInfo>(resource.wifiMac),
  getExamSchedule: () => readCached<ExaminationSchedule>(resource.examSchedule),
  getExamResult: (semesterRef: string) =>
    readCached<ExamResultRecords>(resource.examResult(semesterRef)),
  getCurrentExamResult: () =>
    readCached<ExamResultRecords>(resource.examResult()),
};
