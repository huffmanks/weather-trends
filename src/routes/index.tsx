import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  createLocationMutationOptions,
  importsQueryOptions,
  locationsQueryOptions,
  observationsQueryOptions,
  syncLocationMutationOptions,
  weatherKeys,
} from "@/lib/queries/weather";
import { today } from "@/lib/weather/dates";

export const Route = createFileRoute("/")({
  component: App,
  loader: ({ context: { queryClient } }) =>
    queryClient.query({
      ...locationsQueryOptions(),
      staleTime: "static",
    }),
});

function App() {
  const queryClient = useQueryClient();

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState(today());

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("34.90776");
  const [longitude, setLongitude] = useState("-82.3008");
  const [timezone, setTimezone] = useState("America/New_York");

  const locationsQuery = useQuery(locationsQueryOptions());
  const locations = locationsQuery.data ?? [];

  useEffect(() => {
    if (!selectedLocationId && locations.length > 0) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  const observationsQuery = useQuery(
    observationsQueryOptions({
      locationId: selectedLocationId,
      startDate,
      endDate,
    })
  );

  const importsQuery = useQuery(importsQueryOptions(selectedLocationId));

  const createLocation = useMutation({
    ...createLocationMutationOptions(),
    onSuccess: async (location) => {
      setSelectedLocationId(location.id);
      setName("");
      await queryClient.invalidateQueries({
        queryKey: weatherKeys.locations(),
      });
    },
  });

  const syncLocation = useMutation({
    ...syncLocationMutationOptions(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...weatherKeys.all, "observations"],
        }),
        queryClient.invalidateQueries({
          queryKey: weatherKeys.imports(selectedLocationId),
        }),
      ]);
    },
  });

  const selectedLocation = locations.find((location) => location.id === selectedLocationId);

  function handleCreateLocation(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    createLocation.mutate({
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      timezone,
    });
  }

  function handleSync(importType: "initial" | "manual") {
    syncLocation.mutate({
      locationId: selectedLocationId,
      importType,
      startDate,
      endDate,
    });
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold">Weather Trends</h1>
        <p className="mt-1 text-muted-foreground">Historical weather observations and imports</p>
      </header>

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Locations</h2>

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="min-w-64 rounded-md border bg-background px-3 py-2"
            value={selectedLocationId}
            onChange={(event) => setSelectedLocationId(event.target.value)}>
            <option value="">Select a location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>

          {selectedLocation && (
            <span className="text-sm text-muted-foreground">
              {selectedLocation.latitude}, {selectedLocation.longitude} ·{" "}
              {selectedLocation.timezone}
            </span>
          )}
        </div>

        <form
          onSubmit={handleCreateLocation}
          className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="rounded-md border bg-background px-3 py-2"
            placeholder="Location name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="rounded-md border bg-background px-3 py-2"
            type="number"
            step="any"
            placeholder="Latitude"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            required
          />
          <input
            className="rounded-md border bg-background px-3 py-2"
            type="number"
            step="any"
            placeholder="Longitude"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            required
          />
          <input
            className="rounded-md border bg-background px-3 py-2"
            placeholder="Timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            required
          />
          <button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            type="submit"
            disabled={createLocation.isPending}>
            {createLocation.isPending ? "Adding..." : "Add location"}
          </button>
        </form>

        {createLocation.error && (
          <p className="mt-3 text-sm text-destructive">{createLocation.error.message}</p>
        )}
      </section>

      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Data synchronization</h2>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border px-4 py-2 disabled:opacity-50"
              disabled={!selectedLocationId || syncLocation.isPending}
              onClick={() => handleSync("initial")}>
              Initial import
            </button>
            <button
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
              disabled={!selectedLocationId || syncLocation.isPending}
              onClick={() => handleSync("manual")}>
              {syncLocation.isPending ? "Syncing..." : "Refresh data"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            Start date
            <input
              className="rounded-md border bg-background px-3 py-2"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            End date
            <input
              className="rounded-md border bg-background px-3 py-2"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        {syncLocation.isPending && (
          <p className="mt-4 text-sm text-muted-foreground">
            Fetching weather data and saving observations...
          </p>
        )}

        {syncLocation.data && (
          <div className="mt-4 rounded-md bg-muted p-4 text-sm">
            <p className="font-medium">Import completed</p>
            <p>
              Received: {syncLocation.data.received} · Inserted: {syncLocation.data.inserted} ·
              Updated: {syncLocation.data.updated}
            </p>
          </div>
        )}

        {syncLocation.error && (
          <p className="mt-4 text-sm text-destructive">Sync failed: {syncLocation.error.message}</p>
        )}
      </section>

      <section className="rounded-xl border p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Daily observations</h2>
          <span className="text-sm text-muted-foreground">
            {observationsQuery.data?.length ?? 0} records
          </span>
        </div>

        {observationsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading observations...</p>
        ) : observationsQuery.error ? (
          <p className="text-sm text-destructive">{observationsQuery.error.message}</p>
        ) : !observationsQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">
            No observations found for this date range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-250 text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-3">Date</th>
                  <th className="p-3">Min °C</th>
                  <th className="p-3">Max °C</th>
                  <th className="p-3">Avg °C</th>
                  <th className="p-3">Rain mm</th>
                  <th className="p-3">Precip. mm</th>
                  <th className="p-3">Snow cm</th>
                  <th className="p-3">Wind m/s</th>
                  <th className="p-3">Gust m/s</th>
                  <th className="p-3">Humidity %</th>
                  <th className="p-3">Dew point °C</th>
                </tr>
              </thead>
              <tbody>
                {observationsQuery.data.map((observation) => (
                  <tr key={observation.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{observation.observationDate}</td>
                    <td className="p-3">{observation.temperatureMin ?? "—"}</td>
                    <td className="p-3">{observation.temperatureMax ?? "—"}</td>
                    <td className="p-3">{observation.temperatureAvg?.toFixed(1) ?? "—"}</td>
                    <td className="p-3">{observation.rainTotal ?? "—"}</td>
                    <td className="p-3">{observation.precipitationTotal ?? "—"}</td>
                    <td className="p-3">{observation.snowfallTotal ?? "—"}</td>
                    <td className="p-3">{observation.windSpeedAvg?.toFixed(1) ?? "—"}</td>
                    <td className="p-3">{observation.windGustMax ?? "—"}</td>
                    <td className="p-3">{observation.humidityAvg?.toFixed(0) ?? "—"}</td>
                    <td className="p-3">{observation.dewPointAvg?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-4 text-lg font-semibold">Import history</h2>

        {importsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading imports...</p>
        ) : !importsQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">No imports yet.</p>
        ) : (
          <div className="space-y-3">
            {importsQuery.data.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0">
                <div>
                  <p className="font-medium capitalize">{item.importType}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.startDate} – {item.endDate}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.recordsInserted} inserted · {item.recordsUpdated} updated
                  </p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
