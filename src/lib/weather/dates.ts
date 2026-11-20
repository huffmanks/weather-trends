export function getLocalDate(timezone?: string): Date {
  const isoDateString = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone ?? undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(isoDateString);
}

export function getStartOfYearDate(): Date {
  return new Date(new Date().getFullYear(), 0, 1);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toUtcNoon(date: string | Date): Date {
  const ymd = typeof date === "string" ? date.slice(0, 10) : date.toISOString().slice(0, 10);

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) {
    throw new RangeError(`Invalid date: ${String(date)}`);
  }

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

export function addDays(date: string | Date, days: number): Date {
  const result = toUtcNoon(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function getArchiveEndDate(timezone: string): Date {
  return addDays(getLocalDate(timezone), -5);
}

function toEpochDay(value: string | Date): number {
  if (value instanceof Date) {
    return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }
  return new Date(`${value}T00:00:00Z`).getTime();
}

export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = toEpochDay(startDate);
  const end = toEpochDay(endDate);

  return Math.round((end - start) / 86_400_000) + 1;
}

export function chunkDateRange(
  startDate: Date,
  endDate: Date,
  chunkSize: number
): { startDate: Date; endDate: Date }[] {
  const chunks: { startDate: Date; endDate: Date }[] = [];
  let current = startDate;
  const endTime = endDate.getTime();

  while (current.getTime() <= endTime) {
    const chunkEnd = addDays(current, chunkSize - 1);
    const end = chunkEnd.getTime() < endTime ? chunkEnd : endDate;

    chunks.push({ startDate: current, endDate: end });
    current = addDays(end, 1);
  }

  return chunks;
}

export function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
