export function getLocalDate(timezone?: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone ?? undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return formatDate(result);
}

export function getArchiveEndDate(timezone: string): string {
  return addDays(getLocalDate(timezone), -5);
}

export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();

  return Math.round((end - start) / 86_400_000) + 1;
}

export function chunkDateRange(
  startDate: string,
  endDate: string,
  chunkSize: number
): { startDate: string; endDate: string }[] {
  const chunks: { startDate: string; endDate: string }[] = [];
  let current = startDate;

  while (current <= endDate) {
    const chunkEnd = addDays(current, chunkSize - 1);
    const end = chunkEnd < endDate ? chunkEnd : endDate;

    chunks.push({ startDate: current, endDate: end });
    current = addDays(end, 1);
  }

  return chunks;
}

export function isValidDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) &&
    formatDate(new Date(`${value}T00:00:00Z`)) === value
  );
}
