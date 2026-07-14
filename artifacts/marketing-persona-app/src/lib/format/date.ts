const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatDisplayDate(
  value: string | number | Date,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  return new Date(value).toLocaleDateString(locale, options);
}

export function formatDisplayDateTime(
  value: string | number | Date,
  locale = "en-US",
): string {
  return new Date(value).toLocaleString(locale, {
    ...DEFAULT_DATE_OPTIONS,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMonthYear(
  value: string | number | Date,
  locale = "en-US",
): string {
  return new Date(value).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
