/**
 * Formats a timestamp string from the Amizone API.
 * The API returns times in IST (India Standard Time).
 */
export function formatAmizoneTime(timestamp: string): string {
  if (!timestamp) return "";
  
  // Amizone API returns 'YYYY-MM-DDTHH:mm:ss'.
  // We extract the HH:mm part directly to avoid timezone conversion issues,
  // as it is already in IST.
  if (timestamp.includes('T')) {
    const timePart = timestamp.split('T')[1];
    return timePart.substring(0, 5);
  }
  
  return timestamp.substring(0, 5);
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
