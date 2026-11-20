const DAY_MS = 86_400_000;

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function toUtcNoon(value: string | Date): Date {
  const dateString = value instanceof Date ? formatDate(value) : value;

  if (!isDateString(dateString)) {
    throw new RangeError(`Invalid date: ${String(value)}`);
  }

  return new Date(`${dateString}T12:00:00.000Z`);
}

export function getLocalDate(timezone?: string): Date {
  const dateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return toUtcNoon(dateString);
}

export function getStartOfYearDate(): Date {
  return toUtcNoon(`${new Date().getFullYear()}-01-01`);
}

export function formatDate(date: Date): string {
  if (!isValidDate(date)) throw new RangeError(`Invalid date: ${String(date)}`);

  return date.toISOString().slice(0, 10);
}

export function addDays(value: string | Date, days: number): Date {
  if (!Number.isInteger(days)) throw new RangeError("Days must be an integer.");

  const date = toUtcNoon(value);
  date.setUTCDate(date.getUTCDate() + days);

  return date;
}

export function getArchiveEndDate(timezone: string): Date {
  return addDays(getLocalDate(timezone), -5);
}

function toEpochDay(value: string | Date): number {
  const dateString = value instanceof Date ? formatDate(value) : value;

  if (!isDateString(dateString)) {
    throw new RangeError(`Invalid date: ${String(value)}`);
  }

  return Date.parse(`${dateString}T00:00:00.000Z`);
}

export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  return Math.round((toEpochDay(endDate) - toEpochDay(startDate)) / DAY_MS) + 1;
}

export function chunkDateRange(
  startDate: Date,
  endDate: Date,
  chunkSize: number
): { startDate: Date; endDate: Date }[] {
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    throw new RangeError("Invalid date range.");
  }

  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new RangeError("Chunk size must be a positive integer.");
  }

  const chunks: { startDate: Date; endDate: Date }[] = [];
  const finalDate = toUtcNoon(endDate);
  let currentDate = toUtcNoon(startDate);

  while (currentDate <= finalDate) {
    const chunkEnd = addDays(currentDate, chunkSize - 1);
    const end = chunkEnd < finalDate ? chunkEnd : finalDate;

    chunks.push({ startDate: currentDate, endDate: end });
    currentDate = addDays(end, 1);
  }

  return chunks;
}

export function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}
