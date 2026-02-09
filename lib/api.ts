import { AttendanceRecords, Courses, Profile, ScheduledClasses, SemesterList } from "./types";
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
  schema?: z.ZodType<T>
): Promise<T> {
  const creds = credentials || getLocalCredentials();
  if (!creds) {
    throw new Error("No credentials provided");
  }

  const auth = btoa(`${creds.username}:${creds.password}`);
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid credentials");
    }
    throw new Error(`API error: ${response.statusText}`);
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
  getClassSchedule: (creds: Credentials | undefined, date: string) => {
    const [year, month, day] = date.split("-");
    return fetchFromAmizone<ScheduledClasses>(`/api/v1/class_schedule/${year}/${month}/${day}`, creds);
  },
  getWifiInfo: (creds?: Credentials) => fetchFromAmizone<WifiInfo>("/api/v1/wifi_mac_address", creds),
  getExamSchedule: (creds?: Credentials) => fetchFromAmizone<ExamSchedule>("/api/v1/exam_schedule", creds),
};
