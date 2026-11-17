export type ExploreMetric =
  | "temperatureMin"
  | "temperatureMax"
  | "temperatureAvg"
  | "precipitationTotal"
  | "rainTotal"
  | "snowfallTotal"
  | "snowDepth"
  | "windSpeedAvg"
  | "windSpeedMax"
  | "windGustMax"
  | "humidityMin"
  | "humidityAvg"
  | "humidityMax"
  | "dewPointMin"
  | "dewPointAvg"
  | "dewPointMax";

export type ExploreChartType = "line" | "area" | "bar";

export type ExploreDatePreset = "last30" | "last12" | "ytd" | "all" | "custom";

export type ExploreConfiguration = {
  locationIds: string[];
  metric: ExploreMetric;
  chartType: ExploreChartType;
  datePreset: ExploreDatePreset;
  startDate: string;
  endDate: string;
  compareYears: boolean;
};
