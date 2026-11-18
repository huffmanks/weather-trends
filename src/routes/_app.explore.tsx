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

import { buildExploreChartData } from "@/lib/explore/chart";
import { getInitialConfiguration, isExploreConfiguration } from "@/lib/explore/config";
import { formatAxisDate, getDateRange } from "@/lib/explore/dates";
import {
  type ExploreConfiguration,
  type ExploreDatePreset,
  exploreMetrics,
} from "@/lib/explore/types";
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
  type ChartConfig,
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

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartTypes = [
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "bar", label: "Bar" },
] as const;

const datePresets = [
  { value: "last30", label: "Last 30 days" },
  { value: "last12", label: "Last 12 months" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All available" },
  { value: "custom", label: "Custom range" },
] as const;

function ExplorePage() {
  const queryClient = useQueryClient();

  const { data: locations = [] } = useQuery(locationsQueryOptions());
  const { data: savedComparisons = [] } = useQuery(savedComparisonsQueryOptions());

  const [configuration, setConfiguration] = useState(getInitialConfiguration);
  const [comparisonName, setComparisonName] = useState("");
  const [selectedComparisonId, setSelectedComparisonId] = useState("");

  const availableLocations = locations.filter((location) => location.isActive);

  const selectedLocationIds = configuration.allLocations
    ? availableLocations.map((location) => location.id)
    : configuration.locationIds;

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

  const observationData = observationQueries.map((query) => query.data ?? []);

  const metric = exploreMetrics.find((item) => item.value === configuration.metric)!;

  const { data: chartData, series } = useMemo(
    () =>
      buildExploreChartData({
        locations: selectedLocations,
        observations: observationData,
        metric: configuration.metric,
        compareYears: configuration.compareYears,
      }),
    [selectedLocations, observationData, configuration.metric, configuration.compareYears]
  );

  const chartConfig: ChartConfig = Object.fromEntries(
    series.map((item, index) => [
      item.key,
      {
        label: item.label,
        color: chartColors[index % chartColors.length],
      },
    ])
  );

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

    updateConfiguration({
      locationIds: [...current],
      allLocations: false,
    });
  }

  function loadComparison(id: string) {
    const comparison = savedComparisons.find((item) => item.id === id);

    if (!comparison || !isExploreConfiguration(comparison.configuration)) return;

    setConfiguration({
      ...comparison.configuration,
      allLocations:
        comparison.configuration.allLocations ?? comparison.configuration.locationIds.length === 0,
    });
    setSelectedComparisonId(id);
  }

  function saveComparison() {
    if (!comparisonName.trim()) return;

    saveMutation.mutate({
      data: {
        name: comparisonName.trim(),
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

  const chartProps = {
    data: chartData,
    margin: { top: 12, right: 12, bottom: 0, left: 0 },
  };

  const chartAxes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis
        dataKey="date"
        tickLine={false}
        axisLine={false}
        minTickGap={32}
        tickFormatter={(value: string) => formatAxisDate(value, configuration.compareYears)}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={56}
        tickFormatter={(value: number) => `${value} ${metric.unit}`}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            formatter={(value) => (typeof value === "number" ? `${value} ${metric.unit}` : value)}
          />
        }
      />
      <ChartLegend content={<ChartLegendContent />} />
    </>
  );

  const chart = (() => {
    if (configuration.chartType === "line") {
      return (
        <LineChart {...chartProps}>
          {chartAxes}
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
      );
    }

    if (configuration.chartType === "area") {
      return (
        <AreaChart {...chartProps}>
          {chartAxes}
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
      );
    }

    return (
      <BarChart {...chartProps}>
        {chartAxes}
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
    );
  })();

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
                  items={exploreMetrics.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  value={configuration.metric}
                  onValueChange={(value) => value && updateConfiguration({ metric: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exploreMetrics.map((item) => (
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
                  items={chartTypes.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  value={configuration.chartType}
                  onValueChange={(value) =>
                    value &&
                    updateConfiguration({
                      chartType: value,
                    })
                  }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {chartTypes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
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
                items={datePresets.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                value={configuration.datePreset}
                onValueChange={(value) => value && updateDatePreset(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {datePresets.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
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
                  : `Daily observations · ${metric.unit}`}
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
