import { getDateRange } from "@/lib/explore/dates";
import type {
  ExploreChartType,
  ExploreConfiguration,
  ExploreDatePreset,
} from "@/lib/explore/types";
import { exploreMetrics } from "@/lib/explore/types";
import { isDateString } from "@/lib/weather/dates";

const chartTypes: ExploreChartType[] = ["line", "area", "bar"];
const datePresets: ExploreDatePreset[] = ["last30", "last12", "ytd", "all", "custom"];

export function getInitialConfiguration(): ExploreConfiguration {
  return {
    locationIds: [],
    allLocations: true,
    metric: "temperatureAvg",
    chartType: "line",
    datePreset: "ytd",
    ...getDateRange("ytd"),
    compareYears: false,
  };
}

export function isExploreConfiguration(value: unknown): value is Omit<
  ExploreConfiguration,
  "allLocations"
> & {
  allLocations?: boolean;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const config = value as Record<string, unknown>;

  return (
    Array.isArray(config.locationIds) &&
    config.locationIds.every((id) => typeof id === "string") &&
    (config.allLocations === undefined || typeof config.allLocations === "boolean") &&
    exploreMetrics.some((metric) => metric.value === config.metric) &&
    typeof config.chartType === "string" &&
    chartTypes.includes(config.chartType as ExploreChartType) &&
    typeof config.datePreset === "string" &&
    datePresets.includes(config.datePreset as ExploreDatePreset) &&
    isDateString(config.startDate) &&
    isDateString(config.endDate) &&
    config.startDate <= config.endDate &&
    typeof config.compareYears === "boolean"
  );
}
