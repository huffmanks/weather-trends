import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ActivityIcon, CalendarDaysIcon, CloudRainIcon, MapPinIcon, WindIcon } from "lucide-react";

import { allObservationsQueryOptions, locationsQueryOptions } from "@/lib/queries/weather";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.query({
      ...locationsQueryOptions(),
      staleTime: "static",
    }),
});

function DashboardPage() {
  const [locationId, setLocationId] = useState<string | null>(null);

  const locationsQuery = useQuery(locationsQueryOptions());
  const locations = locationsQuery.data ?? [];
  const selectedLocationId = locationId || locations[0]?.id || "";

  const observationsQuery = useQuery(allObservationsQueryOptions(selectedLocationId));
  const observations = observationsQuery.data ?? [];

  const recentObservations = observations.filter((item) =>
    [
      item.temperatureMin,
      item.temperatureMax,
      item.temperatureAvg,
      item.precipitationTotal,
      item.windSpeedAvg,
      item.humidityAvg,
    ].some((value) => value !== null)
  );

  const temperatures = recentObservations
    .map((item) => item.temperatureAvg)
    .filter((value): value is number => value !== null);

  const averageTemperature =
    temperatures.length > 0
      ? temperatures.reduce((total, value) => total + value, 0) / temperatures.length
      : null;

  const totalPrecipitation = recentObservations.reduce(
    (total, item) => total + (item.precipitationTotal ?? 0),
    0
  );

  const windSpeeds = recentObservations
    .map((item) => item.windSpeedAvg)
    .filter((value): value is number => value !== null);

  const averageWind =
    windSpeeds.length > 0
      ? windSpeeds.reduce((total, value) => total + value, 0) / windSpeeds.length
      : null;

  const latest = recentObservations.at(-1);

  const dataRange = recentObservations.length
    ? {
        start: recentObservations[0].observationDate,
        end: latest!.observationDate,
      }
    : null;

  const locationOptions = locations.map((location) => ({
    value: location.id,
    label: location.name,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Explore historical weather trends across your locations.
          </p>
        </div>

        <Badge variant="outline" className="w-fit gap-2 py-1.5">
          <ActivityIcon className="size-3.5" />
          Weather analytics
        </Badge>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-2">
          <Label>Location</Label>
          <Select items={locationOptions} value={selectedLocationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {dataRange && (
          <div className="text-sm text-muted-foreground">
            Available data:{" "}
            <span className="font-medium text-foreground">
              {dataRange.start} - {dataRange.end}
            </span>
          </div>
        )}
      </div>

      {!locations.length && !locationsQuery.isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <MapPinIcon className="size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No locations yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Add a location and synchronize its historical weather data to start exploring trends.
            </p>
          </CardContent>
        </Card>
      )}

      {observationsQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            Failed to load observations: {observationsQuery.error.message}
          </CardContent>
        </Card>
      ) : locationsQuery.isLoading || observationsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : selectedLocationId ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Average temperature"
              value={
                averageTemperature === null || !Number.isFinite(averageTemperature)
                  ? "—"
                  : `${averageTemperature.toFixed(1)}°C`
              }
              description="Average across available observations"
              icon={ActivityIcon}
            />
            <MetricCard
              title="Total precipitation"
              value={`${totalPrecipitation.toFixed(1)} mm`}
              description="Total accumulated precipitation"
              icon={CloudRainIcon}
            />
            <MetricCard
              title="Average wind speed"
              value={
                averageWind === null || !Number.isFinite(averageWind)
                  ? "—"
                  : `${averageWind.toFixed(1)} m/s`
              }
              description="Average across available observations"
              icon={WindIcon}
            />
            <MetricCard
              title="Observations"
              value={observations.length.toLocaleString()}
              description="Recorded daily observations"
              icon={CalendarDaysIcon}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Latest observation</CardTitle>
              </CardHeader>
              <CardContent>
                {latest ? (
                  <div className="grid grid-cols-2 gap-6">
                    <ObservationValue label="Date" value={latest.observationDate} />
                    <ObservationValue
                      label="Temperature"
                      value={`${latest.temperatureAvg?.toFixed(1) ?? "—"} °C`}
                    />
                    <ObservationValue
                      label="Humidity"
                      value={`${latest.humidityAvg?.toFixed(0) ?? "—"}%`}
                    />
                    <ObservationValue
                      label="Wind"
                      value={`${latest.windSpeedAvg?.toFixed(1) ?? "—"} m/s`}
                    />
                  </div>
                ) : (
                  <EmptyState message="No observations available for this location." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date range</span>
                  <span className="text-sm font-medium">
                    <span>{recentObservations[0]?.observationDate ?? "—"}</span>
                    <span> - </span>
                    <span>{latest?.observationDate ?? "—"}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Records available</span>
                  <span className="font-semibold">{observations.length.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Partial records</span>
                  <span className="font-semibold">
                    {observations.filter((item) => item.dataStatus === "partial").length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Complete records</span>
                  <span className="font-semibold">
                    {observations.filter((item) => item.dataStatus === "complete").length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent observations</CardTitle>
            </CardHeader>
            <CardContent>
              {observations.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Min °C</TableHead>
                        <TableHead>Max °C</TableHead>
                        <TableHead>Avg °C</TableHead>
                        <TableHead>Precip. mm</TableHead>
                        <TableHead>Wind m/s</TableHead>
                        <TableHead>Humidity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentObservations
                        .slice(-10)
                        .reverse()
                        .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.observationDate}</TableCell>
                            <TableCell>{item.temperatureMin ?? "—"}</TableCell>
                            <TableCell>{item.temperatureMax ?? "—"}</TableCell>
                            <TableCell>{item.temperatureAvg?.toFixed(1) ?? "—"}</TableCell>
                            <TableCell>{item.precipitationTotal ?? "—"}</TableCell>
                            <TableCell>{item.windSpeedAvg?.toFixed(1) ?? "—"}</TableCell>
                            <TableCell>{item.humidityAvg?.toFixed(0) ?? "—"}%</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState message="No observations found. Synchronize this location to get started." />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ObservationValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{message}</p>;
}
