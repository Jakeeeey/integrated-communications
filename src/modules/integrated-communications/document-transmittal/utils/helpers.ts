import { isValidDate } from "@/lib/utils";

/**
 * formatDateTime()
 * Module-specific date formatter.
 * Treats the database string as-is to avoid unwanted timezone shifts.
 */
export function formatDateTime(dateInput: Date | string | null | undefined, locale: string = "en-PH"): string {
  if (!dateInput) return "—";
  
  let date: Date;
  if (typeof dateInput === "string") {
    // We parse the string directly without forcing UTC ('Z').
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (!isValidDate(date)) return "—";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

/**
 * toLocalISOString()
 * Returns a plain YYYY-MM-DD HH:mm:ss string in local time.
 * This prevents databases from auto-converting to UTC.
 */
export function toLocalISOString(date: Date = new Date()): string {
  const pad = (num: number) => String(num).padStart(2, "0");
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * formatDateOnly()
 * Returns a localized date string without the time (e.g., Nov 28, 2026).
 */
export function formatDateOnly(dateInput: Date | string | null | undefined, locale: string = "en-PH"): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (!isValidDate(date)) return "—";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

