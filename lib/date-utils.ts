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
