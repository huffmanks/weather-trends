export const exploreMetrics = [
  { value: "temperatureAvg", label: "Average temperature", unit: "°C" },
  { value: "temperatureMin", label: "Minimum temperature", unit: "°C" },
  { value: "temperatureMax", label: "Maximum temperature", unit: "°C" },
  { value: "apparentTemperatureAvg", label: "Average feels-like temperature", unit: "°C" },
  { value: "apparentTemperatureMin", label: "Minimum feels-like temperature", unit: "°C" },
  { value: "apparentTemperatureMax", label: "Maximum feels-like temperature", unit: "°C" },
  { value: "precipitationTotal", label: "Precipitation", unit: "mm" },
  { value: "rainTotal", label: "Rainfall", unit: "mm" },
  { value: "snowfallTotal", label: "Snowfall", unit: "cm" },
  { value: "precipitationHours", label: "Precipitation duration", unit: "h" },
  { value: "windSpeedAvg", label: "Average wind speed", unit: "km/h" },
  { value: "windSpeedMin", label: "Minimum wind speed", unit: "km/h" },
  { value: "windSpeedMax", label: "Maximum wind speed", unit: "km/h" },
  { value: "windGustAvg", label: "Average wind gust", unit: "km/h" },
  { value: "windGustMin", label: "Minimum wind gust", unit: "km/h" },
  { value: "windGustMax", label: "Maximum wind gust", unit: "km/h" },
  { value: "windDirection", label: "Dominant wind direction", unit: "°" },
  { value: "humidityAvg", label: "Average humidity", unit: "%" },
  { value: "humidityMin", label: "Minimum humidity", unit: "%" },
  { value: "humidityMax", label: "Maximum humidity", unit: "%" },
  { value: "dewPointAvg", label: "Average dew point", unit: "°C" },
  { value: "dewPointMin", label: "Minimum dew point", unit: "°C" },
  { value: "dewPointMax", label: "Maximum dew point", unit: "°C" },
  { value: "daylightDuration", label: "Daylight duration", unit: "h" },
  { value: "sunshineDuration", label: "Sunshine duration", unit: "h" },
] as const;

export type ExploreMetric = (typeof exploreMetrics)[number]["value"];

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
