/**
 * Formats a timestamp string from the Amizone API.
 * The API returns times in IST (India Standard Time).
 */
export function formatAmizoneTime(timestamp: string): string {
  if (!timestamp) return "";
  
  // Amizone API returns 'YYYY-MM-DDTHH:mm:ss'.
  // We extract the HH:mm part directly to avoid timezone conversion issues,
  // as it is already in IST.
  const rawTime = timestamp.includes("T") ? timestamp.split("T")[1] : timestamp;
  const hhmm = rawTime.substring(0, 5);
  const [hh, mm] = hhmm.split(":");
  const hour24 = Number(hh);
  const minute = Number(mm);
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return hhmm;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Formats a calendar date from an Amizone timestamp/date string without
 * applying browser timezone conversion.
 */
export function formatAmizoneDate(timestamp: string): string {
  if (!timestamp) return "";

  const rawDate = timestamp.includes("T") ? timestamp.split("T")[0] : timestamp;
  const [year, month, day] = rawDate.split("-").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return rawDate;
  }

  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Formats a time range string (HH:mm - HH:mm) from class timestamps.
 */
export function formatClassRange(startTime: string, endTime: string): string {
  return `${formatAmizoneTime(startTime)} - ${formatAmizoneTime(endTime)}`;
}

/**
 * Formats a date for display.
 */
export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

export const IST_TIME_ZONE = "Asia/Kolkata";

type TzDateParts = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
};

function getDatePartsInTimeZone(date: Date, timeZone: string, includeTime = false): TzDateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : null),
  });

  const parts = formatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;

  const year = Number(part("year"));
  const month = Number(part("month"));
  const day = Number(part("day"));
  const hour = includeTime ? Number(part("hour")) : undefined;
  const minute = includeTime ? Number(part("minute")) : undefined;

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    // Fallback to local date parts; should be rare, but prevents hard crashes.
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      ...(includeTime ? { hour: date.getHours(), minute: date.getMinutes() } : null),
    };
  }

  return {
    year,
    month,
    day,
    ...(includeTime && Number.isFinite(hour) && Number.isFinite(minute) ? { hour, minute } : null),
  };
}

export function formatISODateInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatISODateInIST(date: Date): string {
  return formatISODateInTimeZone(date, IST_TIME_ZONE);
}

export function isSameDateInTimeZone(a: Date, b: Date, timeZone: string): boolean {
  const ap = getDatePartsInTimeZone(a, timeZone);
  const bp = getDatePartsInTimeZone(b, timeZone);
  return ap.year === bp.year && ap.month === bp.month && ap.day === bp.day;
}

export function isTodayInIST(date: Date): boolean {
  return isSameDateInTimeZone(date, new Date(), IST_TIME_ZONE);
}

export function getMinutesInIST(date: Date): number {
  const { hour = 0, minute = 0 } = getDatePartsInTimeZone(date, IST_TIME_ZONE, true);
  return hour * 60 + minute;
}

export function differenceInCalendarDaysIST(a: Date, b: Date): number {
  const ap = getDatePartsInTimeZone(a, IST_TIME_ZONE);
  const bp = getDatePartsInTimeZone(b, IST_TIME_ZONE);
  const aUTC = Date.UTC(ap.year, ap.month - 1, ap.day);
  const bUTC = Date.UTC(bp.year, bp.month - 1, bp.day);
  return Math.round((aUTC - bUTC) / 86_400_000);
}

export function formatShortDateLabelIST(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatLongDateLabelIST(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}
