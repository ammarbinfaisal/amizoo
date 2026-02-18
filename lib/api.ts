import {
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
import { type, Type } from "arktype";

const rawApiUrl = process.env.NEXT_PUBLIC_AMIZONE_API_URL || "https://api.ami.zoo.fullstacktics.com";
const API_URL = rawApiUrl.startsWith("http") ? rawApiUrl : `https://${rawApiUrl}`;
const CACHE_PREFIX = "amizoo:api-cache:v1";
const isBrowser = typeof window !== "undefined";

export interface Credentials {
  username: string;
  password: string;
}

export type AmizoneRequestInit = Omit<RequestInit, "headers"> & { headers?: Record<string, string> };

interface ScheduleFetchOptions {
  fresh?: boolean;
}

function normalizeEndpoint(endpoint: string) {
  const url = new URL(endpoint, API_URL);
  url.searchParams.delete("refresh");
  return url.toString();
}

function getCacheKey(creds: Credentials, endpoint: string, method: string) {
  const normalized = normalizeEndpoint(endpoint);
  return `${CACHE_PREFIX}:${creds.username}:${method}:${normalized}`;
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
    // Ignore quota errors and keep app responsive.
  }
}

function isNetworkError(error: unknown) {
  if (!isBrowser) return false;
  if (navigator.onLine === false) return true;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : "";
  return message.includes("Failed to fetch") || message.includes("NetworkError");
}

export function getLocalCredentials(): Credentials | null {
  if (typeof window === "undefined") return null;
  const username = localStorage.getItem("amizone_user");
  const password = localStorage.getItem("amizone_pass");
  if (!username || !password) return null;
  return { username, password };
}

export async function fetchFromAmizone<T>(
  endpoint: string,
  credentials?: Credentials,
  schema?: Type<T>,
  init?: AmizoneRequestInit
): Promise<T> {
  const creds = credentials || getLocalCredentials();
  if (!creds) {
    throw new Error("No credentials provided");
  }

  const method = (init?.method || "GET").toUpperCase();
  const canUseCache = isBrowser && method === "GET";
  const cacheKey = canUseCache ? getCacheKey(creds, endpoint, method) : null;

  if (canUseCache && navigator.onLine === false) {
    const cached = cacheKey ? readCache<T>(cacheKey) : null;
    if (cached) {
      if (schema) {
        const result = schema(cached.data);
        if (result instanceof type.errors) {
          throw new Error(result.summary);
        }
        return result as T;
      }
      return cached.data;
    }
    throw new Error("Offline with no cached data available");
  }

  const auth = btoa(`${creds.username}:${creds.password}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...init,
      headers: {
        Authorization: `Basic ${auth}`,
        ...(init?.headers || {}),
      },
    });
  } catch (error) {
    if (canUseCache && cacheKey && isNetworkError(error)) {
      const cached = readCache<T>(cacheKey);
      if (cached) {
        if (schema) {
          const result = schema(cached.data);
          if (result instanceof type.errors) {
            throw new Error(result.summary);
          }
          return result as T;
        }
        return cached.data;
      }
    }
    throw error;
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid credentials");
    }
    const message = await response.text().catch(() => "");
    throw new Error(message || `API error: ${response.statusText}`);
  }

  const data = await response.json();

  let parsed = data as T;
  if (schema) {
    const result = schema(data);
    if (result instanceof type.errors) {
      throw new Error(result.summary);
    }
    parsed = result as T;
  }

  if (canUseCache && cacheKey) {
    writeCache(cacheKey, parsed);
  }

  return parsed;
}

export const amizoneApi = {
  getAttendance: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<AttendanceRecords>("/api/v1/attendance", creds, undefined, init),
  getProfile: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<Profile>("/api/v1/user_profile", creds, undefined, init),
  getSemesters: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<SemesterList>("/api/v1/semesters", creds, undefined, init),
  getCourses: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<Courses>("/api/v1/courses", creds, undefined, init),
  getCoursesBySemester: (creds: Credentials | undefined, semesterRef: string, init?: AmizoneRequestInit) =>
    fetchFromAmizone<Courses>(`/api/v1/courses/${encodeURIComponent(semesterRef)}`, creds, undefined, init),
  getClassSchedule: (creds: Credentials | undefined, date: string, options?: ScheduleFetchOptions) => {
    const [year, month, day] = date.split("-");
    let endpoint = `/api/v1/class_schedule/${year}/${month}/${day}`;
    if (options?.fresh) {
      endpoint = `${endpoint}?refresh=${encodeURIComponent(String(Date.now()))}`;
    }
    return fetchFromAmizone<ScheduledClasses>(endpoint, creds, undefined, options?.fresh ? { cache: "no-store" } : undefined);
  },
  // Legacy shape compatibility (some deployments return { macAddress }).
  getWifiInfo: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<WifiInfo>("/api/v1/wifi_mac_address", creds, undefined, init),
  getWifiMacInfo: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<WifiMacInfo>("/api/v1/wifi_mac", creds, undefined, init),
  registerWifiMac: (creds: Credentials | undefined, address: string, overrideLimit = false) =>
    fetchFromAmizone<void>(
      "/api/v1/wifi_mac",
      creds,
      undefined,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, overrideLimit }),
      }
    ),
  deregisterWifiMac: (creds: Credentials | undefined, address: string) =>
    fetchFromAmizone<void>(`/api/v1/wifi_mac/${encodeURIComponent(address)}`, creds, undefined, { method: "DELETE" }),
  getExamSchedule: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<ExaminationSchedule>("/api/v1/exam_schedule", creds, undefined, init),
  getExamResult: (creds: Credentials | undefined, semesterRef: string, init?: AmizoneRequestInit) =>
    fetchFromAmizone<ExamResultRecords>(`/api/v1/exam_result/${encodeURIComponent(semesterRef)}`, creds, undefined, init),
  getCurrentExamResult: (creds?: Credentials, init?: AmizoneRequestInit) =>
    fetchFromAmizone<ExamResultRecords>("/api/v1/exam_result", creds, undefined, init),
  submitFacultyFeedback: (creds: Credentials | undefined, payload: FillFacultyFeedbackRequest) =>
    fetchFromAmizone<FillFacultyFeedbackResponse>(
      "/api/v1/faculty/feedback/submit",
      creds,
      undefined,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    ),
};
