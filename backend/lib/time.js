// Dates for charts are counted in the pharmacy's local time, not the server's.
// Render runs in UTC, so without this an order at 01:00 in Harare would land on
// the previous day (and sometimes the previous month).
export const TIME_ZONE = process.env.APP_TIMEZONE || 'Africa/Harare';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const NO_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: 'numeric',
  hourCycle: 'h23',
});

// Returns { year, month (0-11), day, weekday ('Sun'..'Sat'), hour (0-23 or null) }
// in TIME_ZONE, or null if the value is not a date.
// A plain 'YYYY-MM-DD' is already a calendar date, so it is kept as is and has no hour.
// A timestamp without a zone is treated as UTC, which is how the API saves them.
export function localParts(value) {
  if (value == null || value === '') return null;
  const s = typeof value === 'string' ? value.trim() : value;

  if (typeof s === 'string' && DATE_ONLY.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return { year: y, month: m - 1, day: d, weekday: WEEKDAYS[wd], hour: null };
  }

  const date =
    value instanceof Date
      ? value
      : new Date(typeof s === 'string' && NO_ZONE.test(s) ? `${s.replace(' ', 'T')}Z` : s);
  if (Number.isNaN(date.getTime())) return null;

  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month) - 1,
    day: Number(p.day),
    weekday: p.weekday,
    hour: Number(p.hour) % 24,
  };
}
