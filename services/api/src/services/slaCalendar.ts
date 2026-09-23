export type SlaWindow = { start: string; end: string };
export type SlaCalendar = {
  workingDays?: number[];
  windows?: SlaWindow[];
  holidays?: string[];
};

const DEFAULT_CALENDAR: Required<SlaCalendar> = {
  workingDays: [1, 2, 3, 4, 5],
  windows: [{ start: '09:00', end: '17:00' }],
  holidays: [],
};

function calendarOrDefault(calendar: unknown): Required<SlaCalendar> {
  if (!calendar || typeof calendar !== 'object') return DEFAULT_CALENDAR;
  const value = calendar as SlaCalendar;
  const workingDays = Array.isArray(value.workingDays) ? value.workingDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : DEFAULT_CALENDAR.workingDays;
  const windows = Array.isArray(value.windows) ? value.windows.filter((window) => /^\d{2}:\d{2}$/.test(window.start) && /^\d{2}:\d{2}$/.test(window.end)) : DEFAULT_CALENDAR.windows;
  return { workingDays: workingDays.length ? workingDays : DEFAULT_CALENDAR.workingDays, windows: windows.length ? windows : DEFAULT_CALENDAR.windows, holidays: Array.isArray(value.holidays) ? value.holidays.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)) : [] };
}

function partsAt(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

function offsetAt(instant: Date, timezone: string) {
  const local = partsAt(instant, timezone);
  return Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) - instant.getTime();
}

export function localDateTimeToUtc(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstGuess = new Date(wall);
  const corrected = wall - offsetAt(firstGuess, timezone);
  return new Date(corrected);
}

function dateString(parts: ReturnType<typeof partsAt>) {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function shiftDate(date: string, days: number) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function weekday(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function windowsForDate(date: string, timezone: string, calendar: Required<SlaCalendar>) {
  if (!calendar.workingDays.includes(weekday(date)) || calendar.holidays.includes(date)) return [];
  return calendar.windows.map((window) => ({ start: localDateTimeToUtc(date, window.start, timezone), end: localDateTimeToUtc(date, window.end, timezone) })).filter((window) => window.end > window.start);
}

export function workingMillisecondsBetween(start: Date, end: Date, timezone: string, calendarInput?: unknown) {
  if (end <= start) return 0;
  const calendar = calendarOrDefault(calendarInput);
  let cursorDate = dateString(partsAt(start, timezone));
  const endDate = dateString(partsAt(end, timezone));
  let total = 0;
  for (let guard = 0; guard < 3700 && cursorDate <= endDate; guard += 1) {
    for (const window of windowsForDate(cursorDate, timezone, calendar)) {
      const from = Math.max(start.getTime(), window.start.getTime());
      const to = Math.min(end.getTime(), window.end.getTime());
      if (to > from) total += to - from;
    }
    cursorDate = shiftDate(cursorDate, 1);
  }
  return total;
}

export function addWorkingHours(start: Date, hours: number, timezone: string, calendarInput?: unknown) {
  if (!Number.isFinite(hours) || hours <= 0) return new Date(start);
  const calendar = calendarOrDefault(calendarInput);
  let cursor = new Date(start);
  let cursorDate = dateString(partsAt(cursor, timezone));
  let remaining = hours * 3600000;
  for (let guard = 0; guard < 3700 && remaining > 0; guard += 1) {
    for (const window of windowsForDate(cursorDate, timezone, calendar)) {
      const from = Math.max(cursor.getTime(), window.start.getTime());
      if (window.end.getTime() <= from) continue;
      const available = window.end.getTime() - from;
      if (available >= remaining) return new Date(from + remaining);
      remaining -= available;
    }
    cursorDate = shiftDate(cursorDate, 1);
    cursor = localDateTimeToUtc(cursorDate, '00:00', timezone);
  }
  throw new Error('SLA_CALENDAR_RANGE_EXCEEDED');
}
