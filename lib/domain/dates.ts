const DAY_MS = 86_400_000;

export function parseCalendarDate(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid calendar date: ${value}`);
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

export function stayDays(startDate: string, endDate: string): number {
  const difference = parseCalendarDate(endDate) - parseCalendarDate(startDate);
  if (difference < 0) return 0;
  return Math.floor(difference / DAY_MS) + 1;
}

export function localDate(date = new Date()): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function addCalendarDays(value: string, days: number): string {
  return new Date(parseCalendarDate(value) + days * DAY_MS).toISOString().slice(0, 10);
}

export function calendarDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function daysInCalendarMonth(year: number, monthOneBased: number): number {
  return new Date(Date.UTC(year, monthOneBased, 0)).getUTCDate();
}

export function calendarMonthEnd(dateStr: string): string {
  parseCalendarDate(dateStr);
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  const days = daysInCalendarMonth(year, month);
  return `${dateStr.slice(0, 7)}-${String(days).padStart(2, "0")}`;
}

export function calendarMonthDueDate(periodStart: string, paymentDayOfMonth = 1): string {
  parseCalendarDate(periodStart);
  const year = Number(periodStart.slice(0, 4));
  const month = Number(periodStart.slice(5, 7));
  const daysInMonth = daysInCalendarMonth(year, month);
  const clampedDay = Math.min(Math.max(1, Math.trunc(paymentDayOfMonth)), daysInMonth);
  const dueCandidate = `${periodStart.slice(0, 7)}-${String(clampedDay).padStart(2, "0")}`;
  return dueCandidate < periodStart ? periodStart : dueCandidate;
}
