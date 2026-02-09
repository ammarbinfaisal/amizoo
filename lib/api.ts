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
import { z } from "zod";

const rawApiUrl = process.env.NEXT_PUBLIC_AMIZONE_API_URL || "https://api.ami.zoo.fullstacktics.com";
const API_URL = rawApiUrl.startsWith("http") ? rawApiUrl : `https://${rawApiUrl}`;

export interface Credentials {
  username: string;
  password: string;
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
  schema?: z.ZodType<T>,
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<T> {
  const creds = credentials || getLocalCredentials();
  if (!creds) {
    throw new Error("No credentials provided");
  }

  const auth = btoa(`${creds.username}:${creds.password}`);
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid credentials");
    }
    const message = await response.text().catch(() => "");
    throw new Error(message || `API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (schema) {
    return schema.parse(data);
  }

  return data;
}

export const amizoneApi = {
  getAttendance: (creds?: Credentials) => fetchFromAmizone<AttendanceRecords>("/api/v1/attendance", creds),
  getProfile: (creds?: Credentials) => fetchFromAmizone<Profile>("/api/v1/user_profile", creds),
  getSemesters: (creds?: Credentials) => fetchFromAmizone<SemesterList>("/api/v1/semesters", creds),
  getCourses: (creds?: Credentials) => fetchFromAmizone<Courses>("/api/v1/courses", creds),
  getCoursesBySemester: (creds: Credentials | undefined, semesterRef: string) =>
    fetchFromAmizone<Courses>(`/api/v1/courses/${encodeURIComponent(semesterRef)}`, creds),
  getClassSchedule: (creds: Credentials | undefined, date: string) => {
    const [year, month, day] = date.split("-");
    return fetchFromAmizone<ScheduledClasses>(`/api/v1/class_schedule/${year}/${month}/${day}`, creds);
  },
  // Legacy shape compatibility (some deployments return { macAddress }).
  getWifiInfo: (creds?: Credentials) => fetchFromAmizone<WifiInfo>("/api/v1/wifi_mac_address", creds),
  getWifiMacInfo: (creds?: Credentials) => fetchFromAmizone<WifiMacInfo>("/api/v1/wifi_mac", creds),
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
  getExamSchedule: (creds?: Credentials) => fetchFromAmizone<ExaminationSchedule>("/api/v1/exam_schedule", creds),
  getExamResult: (creds: Credentials | undefined, semesterRef: string) =>
    fetchFromAmizone<ExamResultRecords>(`/api/v1/exam_result/${encodeURIComponent(semesterRef)}`, creds),
  getCurrentExamResult: (creds?: Credentials) => fetchFromAmizone<ExamResultRecords>("/api/v1/exam_result", creds),
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
