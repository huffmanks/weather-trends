import type { ExploreMetric } from "@/lib/explore/constants";

export type ExploreChartType = "line" | "area" | "bar";

export type ExploreDatePreset = "last30" | "last12" | "ytd" | "all" | "custom";

export type ExploreConfiguration = {
  locationIds: string[];
  allLocations: boolean;
  metric: ExploreMetric;
  chartType: ExploreChartType;
  datePreset: ExploreDatePreset;
  startDate: string;
  endDate: string;
  compareYears: boolean;
};

export type ExploreChartSeries = {
  key: string;
  label: string;
};

export type ExploreChartRow = Record<string, string | number | null>;

export type ExploreUnits = {
  temperatureUnit: "celsius" | "fahrenheit";
  precipitationUnit: "mm" | "in";
  windSpeedUnit: "ms" | "kmh" | "mph";
};
