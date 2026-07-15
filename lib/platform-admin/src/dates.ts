/** Normalize Drizzle timestamp values from Postgres (Date) or D1 (ms number / ISO string). */
export function toIsoString(value: Date | string | number): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

export function toIsoStringOrNull(
  value: Date | string | number | null | undefined,
): string | null {
  if (value == null) return null;
  return toIsoString(value);
}
