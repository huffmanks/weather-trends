import type { ExploreDatePreset } from "@/lib/explore/types";

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDateRange(preset: Exclude<ExploreDatePreset, "custom">) {
  const today = new Date();
  const endDate = formatLocalDate(today);

  if (preset === "all") return { startDate: "1940-01-01", endDate };
  if (preset === "ytd") return { startDate: `${today.getFullYear()}-01-01`, endDate };

  const start = new Date(today);

  if (preset === "last12") {
    const targetYear = start.getFullYear() - 1;
    const targetMonth = start.getMonth();
    const targetDay = start.getDate();

    start.setDate(1);
    start.setFullYear(targetYear);
    start.setMonth(targetMonth);
    start.setDate(Math.min(targetDay, new Date(targetYear, targetMonth + 1, 0).getDate()));
  } else {
    start.setDate(start.getDate() - 29);
  }

  return { startDate: formatLocalDate(start), endDate };
}

export function formatAxisDate(value: string, compareYears: boolean) {
  const date = new Date(compareYears ? `2000-${value}T12:00:00` : `${value}T12:00:00`);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
