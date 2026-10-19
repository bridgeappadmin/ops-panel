// Indian time (UTC+05:30, no DST), hand-formatted like the server's date.util.ts and the client's istTime.ts.
// No Intl: some ICU builds put U+202F before AM/PM.
const IST_OFFSET_MS = 330 * 60 * 1000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ist = (time: string | Date) => new Date(new Date(time).getTime() + IST_OFFSET_MS);

/** '7:42 PM' */
export function formatIstTime(iso: string): string {
  const t = ist(iso);
  const hours = t.getUTCHours();
  return `${hours % 12 || 12}:${String(t.getUTCMinutes()).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** '26 Oct, 5:30 PM' */
export function formatIstDateTime(iso: string): string {
  const t = ist(iso);
  return `${t.getUTCDate()} ${MONTH_NAMES[t.getUTCMonth()]}, ${formatIstTime(iso)}`;
}

/** '1,00,000' */
export const formatNumber = (n: number): string => n.toLocaleString('en-IN');

/** The IST month as 'YYYY-MM', the report's and the budget's month key. */
export function currentIstMonth(now: Date = new Date()): string {
  const t = ist(now);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
}
