import type { AppSettingsUpdate, DailyObservation } from "@/db/schema";
import type { ExploreMetric } from "@/lib/explore/constants";
import type { ExploreChartRow, ExploreChartSeries } from "@/lib/explore/types";
import { convertPrecipitation, convertTemperature, convertWindSpeed } from "@/lib/settings/units";

type ExploreLocation = {
  id: string;
  name: string;
};

type ExploreObservation = Pick<DailyObservation, "observationDate" | ExploreMetric>;

type BuildExploreChartDataOptions = {
  locations: ExploreLocation[];
  observations: ExploreObservation[][];
  metric: ExploreMetric;
  compareYears: boolean;
} & Pick<AppSettingsUpdate, "temperatureUnit" | "precipitationUnit" | "windSpeedUnit">;

const TEMPERATURE_METRICS = new Set<ExploreMetric>([
  "temperatureAvg",
  "temperatureMin",
  "temperatureMax",
  "apparentTemperatureAvg",
  "apparentTemperatureMin",
  "apparentTemperatureMax",
  "dewPointAvg",
  "dewPointMin",
  "dewPointMax",
]);

const PRECIPITATION_METRICS = new Set<ExploreMetric>(["precipitationTotal", "rainTotal"]);

const WIND_METRICS = new Set<ExploreMetric>([
  "windSpeedAvg",
  "windSpeedMin",
  "windSpeedMax",
  "windGustAvg",
  "windGustMin",
  "windGustMax",
]);

function convertMetricValue(
  value: number | null,
  metric: ExploreMetric,
  settings: Pick<AppSettingsUpdate, "temperatureUnit" | "precipitationUnit" | "windSpeedUnit">
) {
  if (value === null) return null;

  if (TEMPERATURE_METRICS.has(metric)) {
    return convertTemperature(value, settings.temperatureUnit);
  }

  if (PRECIPITATION_METRICS.has(metric)) {
    return convertPrecipitation(value, settings.precipitationUnit);
  }

  if (WIND_METRICS.has(metric)) {
    return convertWindSpeed(value, settings.windSpeedUnit);
  }

  return value;
}

export function buildExploreChartData({
  locations,
  observations,
  metric,
  compareYears,
  temperatureUnit,
  precipitationUnit,
  windSpeedUnit,
}: BuildExploreChartDataOptions) {
  const settings = { temperatureUnit, precipitationUnit, windSpeedUnit };
  const rows = new Map<string, ExploreChartRow>();
  const series: ExploreChartSeries[] = [];

  locations.forEach((location, index) => {
    const locationObservations = observations[index] ?? [];

    if (compareYears) {
      const years = new Map<string, ExploreObservation[]>();

      locationObservations.forEach((observation) => {
        const year = observation.observationDate.slice(0, 4);
        const yearObservations = years.get(year) ?? [];

        yearObservations.push(observation);
        years.set(year, yearObservations);
      });

      [...years.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([year, yearObservations]) => {
          const key = `series_${series.length}`;

          series.push({
            key,
            label: `${location.name} · ${year}`,
          });

          yearObservations.forEach((observation) => {
            const date = observation.observationDate.slice(5);
            const row = rows.get(date) ?? { date };

            row[key] = convertMetricValue(observation[metric], metric, settings);
            rows.set(date, row);
          });
        });

      return;
    }

    const key = `series_${series.length}`;

    series.push({
      key,
      label: location.name,
    });

    locationObservations.forEach((observation) => {
      const date = observation.observationDate;
      const row = rows.get(date) ?? { date };

      row[key] = convertMetricValue(observation[metric], metric, settings);
      rows.set(date, row);
    });
  });

  const data = [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return { data, series };
}
