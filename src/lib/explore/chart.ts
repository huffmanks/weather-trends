import type { DailyObservation } from "@/db/schema";
import type { ExploreChartRow, ExploreChartSeries, ExploreMetric } from "@/lib/explore/types";

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
};

export function buildExploreChartData({
  locations,
  observations,
  metric,
  compareYears,
}: BuildExploreChartDataOptions) {
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

            row[key] = observation[metric];
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

      row[key] = observation[metric];
      rows.set(date, row);
    });
  });

  const data = [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return { data, series };
}
