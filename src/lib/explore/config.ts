import { getDateRange } from "@/lib/explore/dates";
import type {
  ExploreChartType,
  ExploreConfiguration,
  ExploreDatePreset,
} from "@/lib/explore/types";
import { exploreMetrics } from "@/lib/explore/types";

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
  if (!value || typeof value !== "object") return false;

  const config = value as Record<string, unknown>;

  return (
    Array.isArray(config.locationIds) &&
    config.locationIds.every((id) => typeof id === "string") &&
    (config.allLocations === undefined || typeof config.allLocations === "boolean") &&
    exploreMetrics.some((metric) => metric.value === config.metric) &&
    (["line", "area", "bar"] satisfies ExploreChartType[]).includes(
      config.chartType as ExploreChartType
    ) &&
    (["last30", "last12", "ytd", "all", "custom"] satisfies ExploreDatePreset[]).includes(
      config.datePreset as ExploreDatePreset
    ) &&
    typeof config.startDate === "string" &&
    typeof config.endDate === "string" &&
    typeof config.compareYears === "boolean"
  );
}
