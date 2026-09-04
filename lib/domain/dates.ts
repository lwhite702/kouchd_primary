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
