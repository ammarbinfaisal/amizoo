import { Attendance } from "@/lib/types";

export function calculateAttendancePercentage(attendance: Attendance) {
  if (attendance.held === 0) return "NA";
  return ((attendance.attended / attendance.held) * 100).toFixed(2);
}

export function getAttendancePercentageValue(attendance: Attendance) {
  if (attendance.held === 0) return null;
  return (attendance.attended / attendance.held) * 100;
}

export function getAttendanceTextColor(attendance: Attendance) {
  const percentage = getAttendancePercentageValue(attendance);
  if (percentage === null) return "text-muted-foreground";
  if (percentage > 90) return "text-emerald-700";
  if (percentage >= 75) return "text-amber-600";
  if (percentage < 70) return "text-rose-800";
  return "text-red-700";
}

export function getAttendanceBadgeColor(attendance: Attendance) {
  const percentage = getAttendancePercentageValue(attendance);
  if (percentage === null) return "text-muted-foreground border-muted-foreground/30";
  if (percentage > 90) return "text-emerald-700 border-emerald-700/40";
  if (percentage >= 75) return "text-amber-600 border-amber-500/50";
  if (percentage < 70) return "text-rose-800 border-rose-800/40";
  return "text-red-700 border-red-700/40";
}

export function isCriticalAttendance(attendance: Attendance) {
  const percentage = getAttendancePercentageValue(attendance);
  return percentage !== null && percentage < 70;
}

export function formatAttendanceRatio(attendance: Attendance) {
  return `${attendance.attended}/${attendance.held}`;
}

export function formatInternalMarks(marks: { have: number; max: number }) {
  if (!marks.have && !marks.max) return "NA";
  if (!marks.max) return `${marks.have}`;
  return `${marks.have} / ${marks.max}`;
}
