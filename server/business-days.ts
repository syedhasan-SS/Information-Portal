/**
 * Business-day utilities.
 * Business days = Monday – Friday (all 24 hours).
 * Weekends (Saturday & Sunday) are excluded from SLA timers.
 */

/** True if the given date falls on a Saturday or Sunday. */
export function isWeekend(date: Date): boolean {
  const d = date.getDay(); // 0 = Sunday, 6 = Saturday
  return d === 0 || d === 6;
}

/**
 * Add `hours` business hours to `start`, skipping weekends.
 * Uses hour-by-hour iteration (efficient for typical SLA values ≤ 720 h).
 */
export function addBusinessHours(start: Date, hours: number): Date {
  const MS_PER_HOUR = 3_600_000;
  let current = new Date(start);
  let remaining = hours;

  while (remaining > 0) {
    current = new Date(current.getTime() + MS_PER_HOUR);
    // Only count the hour if it ends on a weekday
    if (!isWeekend(current)) remaining--;
  }
  return current;
}

/**
 * Count business hours between two timestamps.
 * Optimised: counts full calendar weeks first (5 × 24 = 120 biz-h/week),
 * then iterates hour-by-hour over the remaining < 7-day tail.
 */
export function businessHoursBetween(start: Date, end: Date): number {
  if (end <= start) return 0;

  const MS_PER_HOUR  = 3_600_000;
  const MS_PER_WEEK  = 7 * 24 * MS_PER_HOUR;
  const BIZ_H_PER_WEEK = 5 * 24; // Mon–Fri, all hours

  const totalMs   = end.getTime() - start.getTime();
  const fullWeeks = Math.floor(totalMs / MS_PER_WEEK);
  let bizHours    = fullWeeks * BIZ_H_PER_WEEK;

  // Remaining period (< 7 days)
  let current = new Date(start.getTime() + fullWeeks * MS_PER_WEEK);
  while (current < end) {
    const next = new Date(current.getTime() + MS_PER_HOUR);
    const day  = current.getDay();
    if (day >= 1 && day <= 5) { // Mon–Fri
      if (next <= end) {
        bizHours++;
      } else {
        // Partial last hour
        bizHours += (end.getTime() - current.getTime()) / MS_PER_HOUR;
      }
    }
    current = next;
  }
  return bizHours;
}

/** Convert business hours to a human-readable string. */
export function formatBusinessDuration(hours: number): string {
  if (hours < 1)  return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  const days = hours / 8; // 8-hour work day for display
  return `${Math.round(days * 10) / 10}d`;
}
