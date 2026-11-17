import { useMemo, useState } from "react";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import type { ExploreConfiguration, ExploreDatePreset, ExploreMetric } from "@/lib/explore/types";
import {
  comparisonQueryKeys,
  locationsQueryOptions,
  observationsQueryOptions,
  savedComparisonsQueryOptions,
} from "@/lib/queries/weather";
import { createSavedComparisonFn, deleteSavedComparisonFn } from "@/server/functions/comparisons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/explore")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.query({ ...locationsQueryOptions(), staleTime: "static" }),
      queryClient.query({ ...savedComparisonsQueryOptions(), staleTime: "static" }),
    ]);
  },
  component: ExplorePage,
});

const metrics: { value: ExploreMetric; label: string }[] = [
  { value: "temperatureAvg", label: "Average temperature" },
  { value: "temperatureMin", label: "Minimum temperature" },
  { value: "temperatureMax", label: "Maximum temperature" },
  { value: "precipitationTotal", label: "Precipitation" },
  { value: "rainTotal", label: "Rainfall" },
  { value: "snowfallTotal", label: "Snowfall" },
  { value: "snowDepth", label: "Snow depth" },
  { value: "windSpeedAvg", label: "Average wind speed" },
  { value: "windSpeedMax", label: "Maximum wind speed" },
  { value: "windGustMax", label: "Maximum wind gust" },
  { value: "humidityAvg", label: "Average humidity" },
  { value: "humidityMin", label: "Minimum humidity" },
  { value: "humidityMax", label: "Maximum humidity" },
  { value: "dewPointAvg", label: "Average dew point" },
  { value: "dewPointMin", label: "Minimum dew point" },
  { value: "dewPointMax", label: "Maximum dew point" },
];

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateRange(preset: ExploreDatePreset) {
  const today = new Date();
  const endDate = formatLocalDate(today);

  if (preset === "all") {
    return { startDate: "1900-01-01", endDate };
  }

  if (preset === "ytd") {
    return { startDate: `${today.getFullYear()}-01-01`, endDate };
  }

  if (preset === "last12") {
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 1);

    return { startDate: formatLocalDate(start), endDate };
  }

  const start = new Date(today);
  start.setDate(start.getDate() - 29);

  return { startDate: formatLocalDate(start), endDate };
}

function getInitialConfiguration(): ExploreConfiguration {
  const range = getDateRange("ytd");

  return {
    locationIds: [],
    metric: "temperatureAvg",
    chartType: "line",
    datePreset: "ytd",
    ...range,
    compareYears: false,
  };
}

function isExploreConfiguration(value: unknown): value is ExploreConfiguration {
  if (!value || typeof value !== "object") return false;

  const config = value as Record<string, unknown>;

  return (
    Array.isArray(config.locationIds) &&
    config.locationIds.every((id) => typeof id === "string") &&
    metrics.some((metric) => metric.value === config.metric) &&
    ["line", "area", "bar"].includes(String(config.chartType)) &&
    ["last30", "last12", "ytd", "all", "custom"].includes(String(config.datePreset)) &&
    typeof config.startDate === "string" &&
    typeof config.endDate === "string" &&
    typeof config.compareYears === "boolean"
  );
}

function formatAxisDate(value: string, compareYears: boolean) {
  const date = compareYears ? new Date(`2000-${value}T12:00:00`) : new Date(`${value}T12:00:00`);

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ExplorePage() {
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery(locationsQueryOptions());
  const { data: savedComparisons = [] } = useQuery(savedComparisonsQueryOptions());

  const [configuration, setConfiguration] = useState(getInitialConfiguration);
  const [comparisonName, setComparisonName] = useState("");
  const [selectedComparisonId, setSelectedComparisonId] = useState("");

  const availableLocations = locations.filter((location) => location.isActive);
  const selectedLocationIds =
    configuration.locationIds.length > 0
      ? configuration.locationIds
      : availableLocations.map((location) => location.id);
  const selectedLocations = availableLocations.filter((location) =>
    selectedLocationIds.includes(location.id)
  );

  const observationQueries = useQueries({
    queries: selectedLocations.map((location) =>
      observationsQueryOptions({
        locationId: location.id,
        startDate: configuration.startDate,
        endDate: configuration.endDate,
      })
    ),
  });

  const isLoading = observationQueries.some((query) => query.isLoading);
  const hasError = observationQueries.some((query) => query.isError);

  const metric = metrics.find((item) => item.value === configuration.metric) ?? metrics[0];

  const observationData = observationQueries.map((query) => query.data ?? []);

  const { chartData, chartConfig, series } = useMemo(() => {
    const rows = new Map<string, Record<string, string | number | null>>();
    const chartSeries: { key: string; label: string }[] = [];

    selectedLocations.forEach((location, index) => {
      const observations = observationData[index] ?? [];

      if (configuration.compareYears) {
        const years = new Map<number, typeof observations>();

        observations.forEach((observation) => {
          const year = Number(observation.observationDate.slice(0, 4));
          const yearObservations = years.get(year) ?? [];

          yearObservations.push(observation);
          years.set(year, yearObservations);
        });

        [...years.entries()]
          .sort(([a], [b]) => a - b)
          .forEach(([year, yearObservations]) => {
            const key = `series_${chartSeries.length}`;

            chartSeries.push({
              key,
              label: `${location.name} · ${year}`,
            });

            yearObservations.forEach((observation) => {
              const date = observation.observationDate.slice(5);
              const row = rows.get(date) ?? { date };

              row[key] = observation[configuration.metric];
              rows.set(date, row);
            });
          });

        return;
      }

      const key = `series_${chartSeries.length}`;

      chartSeries.push({
        key,
        label: location.name,
      });

      observations.forEach((observation) => {
        const date = observation.observationDate;
        const row = rows.get(date) ?? { date };

        row[key] = observation[configuration.metric];
        rows.set(date, row);
      });
    });

    const data = [...rows.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const config = Object.fromEntries(
      chartSeries.map((item, index) => [
        item.key,
        {
          label: item.label,
          color: chartColors[index % chartColors.length],
        },
      ])
    );

    return {
      chartData: data,
      chartConfig: config,
      series: chartSeries,
    };
  }, [configuration.compareYears, configuration.metric, observationData, selectedLocations]);

  const saveMutation = useMutation({
    mutationFn: createSavedComparisonFn,
    onSuccess: async () => {
      setComparisonName("");
      await queryClient.invalidateQueries({ queryKey: comparisonQueryKeys.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSavedComparisonFn,
    onSuccess: async () => {
      setSelectedComparisonId("");
      await queryClient.invalidateQueries({ queryKey: comparisonQueryKeys.all });
    },
  });

  function updateConfiguration(updates: Partial<ExploreConfiguration>) {
    setConfiguration((current) => ({ ...current, ...updates }));
  }

  function updateDatePreset(preset: ExploreDatePreset) {
    if (preset === "custom") {
      updateConfiguration({ datePreset: preset });
      return;
    }

    updateConfiguration({
      datePreset: preset,
      ...getDateRange(preset),
    });
  }

  function toggleLocation(locationId: string, checked: boolean) {
    const current = new Set(selectedLocationIds);

    if (checked) {
      current.add(locationId);
    } else {
      current.delete(locationId);
    }

    updateConfiguration({ locationIds: [...current] });
  }

  function loadComparison(id: string) {
    const comparison = savedComparisons.find((item) => item.id === id);

    if (!comparison || !isExploreConfiguration(comparison.configuration)) return;

    setConfiguration(comparison.configuration);
    setSelectedComparisonId(id);
  }

  function saveComparison() {
    if (!comparisonName.trim()) return;

    saveMutation.mutate({
      data: {
        name: comparisonName,
        configuration: {
          ...configuration,
          locationIds: selectedLocationIds,
        },
      },
    });
  }

  const observationCount = observationQueries.reduce(
    (total, query) => total + (query.data?.length ?? 0),
    0
  );

  const chart = (
    <>
      {configuration.chartType === "line" && (
        <LineChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tickFormatter={(value: string) => formatAxisDate(value, configuration.compareYears)}
          />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((item) => (
            <Line
              key={item.key}
              dataKey={item.key}
              name={item.label}
              type="monotone"
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      )}

      {configuration.chartType === "area" && (
        <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tickFormatter={(value: string) => formatAxisDate(value, configuration.compareYears)}
          />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((item) => (
            <Area
              key={item.key}
              dataKey={item.key}
              name={item.label}
              type="monotone"
              stroke={`var(--color-${item.key})`}
              fill={`var(--color-${item.key})`}
              fillOpacity={0.12}
              strokeWidth={2}
              connectNulls
            />
          ))}
        </AreaChart>
      )}

      {configuration.chartType === "bar" && (
        <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            minTickGap={32}
            tickFormatter={(value: string) => formatAxisDate(value, configuration.compareYears)}
          />
          <YAxis tickLine={false} axisLine={false} width={48} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              name={item.label}
              fill={`var(--color-${item.key})`}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
        <p className="text-muted-foreground">
          Compare weather trends across locations and time periods.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Saved comparisons</CardTitle>
              <CardDescription>Load a previous chart configuration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                items={savedComparisons.map((comparison) => ({
                  value: comparison.id,
                  label: comparison.name,
                }))}
                value={selectedComparisonId}
                onValueChange={(value) => value && loadComparison(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a comparison" />
                </SelectTrigger>
                <SelectContent>
                  {savedComparisons.map((comparison) => (
                    <SelectItem key={comparison.id} value={comparison.id}>
                      {comparison.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  value={comparisonName}
                  onChange={(event) => setComparisonName(event.target.value)}
                  placeholder="Comparison name"
                  aria-label="Comparison name"
                />
                <Button
                  onClick={saveComparison}
                  disabled={!comparisonName.trim() || saveMutation.isPending}>
                  Save
                </Button>
              </div>

              {selectedComparisonId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => deleteMutation.mutate({ data: selectedComparisonId })}
                  disabled={deleteMutation.isPending}>
                  Delete saved comparison
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Locations</CardTitle>
              <CardDescription>Select one or more locations to compare.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableLocations.map((location) => (
                <div key={location.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`location-${location.id}`}
                    checked={selectedLocationIds.includes(location.id)}
                    onCheckedChange={(checked) => toggleLocation(location.id, checked === true)}
                  />
                  <Label htmlFor={`location-${location.id}`} className="font-normal">
                    {location.name}
                  </Label>
                </div>
              ))}

              {availableLocations.length === 0 && (
                <p className="text-sm text-muted-foreground">No active locations available.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chart settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select
                  items={metrics.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  value={configuration.metric}
                  onValueChange={(value) => value && updateConfiguration({ metric: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metrics.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chart type</Label>
                <Select
                  items={[
                    { value: "line", label: "Line" },
                    { value: "area", label: "Area" },
                    { value: "bar", label: "Bar" },
                  ]}
                  value={configuration.chartType}
                  onValueChange={(value) => value && updateConfiguration({ chartType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Date range</CardTitle>
              <CardDescription>Choose a period or set custom dates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                items={[
                  { value: "last30", label: "Last 30 days" },
                  { value: "last12", label: "Last 12 months" },
                  { value: "ytd", label: "Year to date" },
                  { value: "all", label: "All available" },
                  { value: "custom", label: "Custom range" },
                ]}
                value={configuration.datePreset}
                onValueChange={(value) => value && updateDatePreset(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="last12">Last 12 months</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                  <SelectItem value="all">All available</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              {configuration.datePreset === "custom" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="start-date">Start date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={configuration.startDate}
                      max={configuration.endDate}
                      onChange={(event) => updateConfiguration({ startDate: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date">End date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={configuration.endDate}
                      min={configuration.startDate}
                      onChange={(event) => updateConfiguration({ endDate: event.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="compare-years"
                  checked={configuration.compareYears}
                  onCheckedChange={(checked) =>
                    updateConfiguration({ compareYears: checked === true })
                  }
                />
                <Label htmlFor="compare-years" className="font-normal">
                  Compare years on a shared calendar
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Locations</CardDescription>
                <CardTitle className="text-2xl">{selectedLocations.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Observations</CardDescription>
                <CardTitle className="text-2xl">{observationCount.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Date range</CardDescription>
                <CardTitle className="text-base">
                  {configuration.startDate} – {configuration.endDate}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{metric.label}</CardTitle>
              <CardDescription>
                {configuration.compareYears
                  ? "Dates are aligned by month and day across years."
                  : "Daily observations for the selected locations."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-90 items-center justify-center text-sm text-muted-foreground">
                  Loading observations…
                </div>
              ) : hasError ? (
                <div className="flex h-90 items-center justify-center text-sm text-destructive">
                  Unable to load observations.
                </div>
              ) : selectedLocations.length === 0 ? (
                <div className="flex h-90 items-center justify-center text-sm text-muted-foreground">
                  Select at least one location.
                </div>
              ) : chartData.length === 0 ? (
                <div className="flex h-90 items-center justify-center text-sm text-muted-foreground">
                  No observations found for this date range.
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-90 w-full">
                  {chart}
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
