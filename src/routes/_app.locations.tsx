import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MapPinIcon, PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";

import type { Location } from "@/db/schema";
import {
  createLocationMutationOptions,
  decadesQueryOptions,
  deleteLocationMutationOptions,
  importsQueryOptions,
  locationsQueryOptions,
  pauseImportMutationOptions,
  syncLocationMutationOptions,
  updateLocationMutationOptions,
  weatherKeys,
} from "@/lib/queries/weather";
import { daysBetween, formatDate, getArchiveEndDate, toUtcNoon } from "@/lib/weather/dates";
import type { WeatherSyncInput } from "@/lib/weather/types";
import { IMPORT_DECADES } from "@/lib/weather/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/locations")({
  component: LocationsPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.query({
      ...locationsQueryOptions(),
      staleTime: "static",
    }),
});

type LocationForm = {
  name: string;
  latitude: string;
  longitude: string;
  timezone: string;
};

const emptyForm: LocationForm = {
  name: "",
  latitude: "",
  longitude: "",
  timezone: "America/New_York",
};

function LocationsPage() {
  const queryClient = useQueryClient();
  const locationsQuery = useQuery(locationsQueryOptions());
  const locations = locationsQuery.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [syncingId, setSyncingId] = useState("");

  const createLocation = useMutation({
    ...createLocationMutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: weatherKeys.locations() });
      closeDialog();
    },
  });

  const updateLocation = useMutation({
    ...updateLocationMutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: weatherKeys.locations() });
      closeDialog();
    },
  });

  const deleteLocation = useMutation({
    ...deleteLocationMutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: weatherKeys.locations() });
    },
  });

  const syncLocation = useMutation(syncLocationMutationOptions());
  const pauseImport = useMutation(pauseImportMutationOptions());

  async function runImport(input: WeatherSyncInput & { importId?: string }) {
    setSyncingId(input.locationId);

    try {
      let result = await syncLocation.mutateAsync(input);

      while (result.status === "running") {
        result = await syncLocation.mutateAsync({
          locationId: input.locationId,
          importId: result.importId,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...weatherKeys.all, "observations"] }),
        queryClient.invalidateQueries({ queryKey: weatherKeys.imports(input.locationId) }),
        queryClient.invalidateQueries({ queryKey: weatherKeys.decades(input.locationId) }),
      ]);
    } finally {
      setSyncingId("");
    }
  }

  async function handlePause(importId: string, locationId: string) {
    await pauseImport.mutateAsync(importId);
    await queryClient.invalidateQueries({ queryKey: weatherKeys.imports(locationId) });
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingLocation(null);
    setForm(emptyForm);
  }

  function openCreateDialog() {
    setEditingLocation(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(location: Location) {
    setEditingLocation(location);
    setForm({
      name: location.name,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      timezone: location.timezone,
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      name: form.name.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      timezone: form.timezone.trim(),
    };

    if (editingLocation) {
      updateLocation.mutate({ id: editingLocation.id, ...input });
      return;
    }

    createLocation.mutate(input);
  }

  const isSaving = createLocation.isPending || updateLocation.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage locations and synchronize historical weather observations.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button onClick={openCreateDialog}>
                <PlusIcon className="mr-2 size-4" />
                Add location
              </Button>
            }></DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLocation ? "Edit location" : "Add location"}</DialogTitle>
              <DialogDescription>
                Configure the coordinates and timezone used for weather data.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                  id="location-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="New York"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="location-latitude">Latitude</Label>
                  <Input
                    id="location-latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={(event) => setForm({ ...form, latitude: event.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location-longitude">Longitude</Label>
                  <Input
                    id="location-longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={(event) => setForm({ ...form, longitude: event.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location-timezone">Timezone</Label>
                <Input
                  id="location-timezone"
                  value={form.timezone}
                  onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                  placeholder="America/New_York"
                  required
                />
              </div>

              {(createLocation.error || updateLocation.error) && (
                <p className="text-sm text-destructive">
                  {(createLocation.error ?? updateLocation.error)?.message}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingLocation ? "Save changes" : "Add location"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locationsQuery.error && (
        <p className="text-sm text-destructive">{locationsQuery.error.message}</p>
      )}

      {locationsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading locations...</p>
      ) : locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <MapPinIcon className="size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No locations configured</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Add your first location to begin collecting historical weather data.
            </p>
            <Button onClick={openCreateDialog}>
              <PlusIcon className="mr-2 size-4" />
              Add location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              syncing={syncingId === location.id}
              onEdit={() => openEditDialog(location)}
              onDelete={() => {
                if (window.confirm(`Delete ${location.name} and its associated weather data?`)) {
                  deleteLocation.mutate(location.id);
                }
              }}
              onSync={(input) => {
                void runImport(input);
              }}
              onPause={(importId) => {
                void handlePause(importId, location.id);
              }}
              onToggle={(isActive) => updateLocation.mutate({ id: location.id, isActive })}
            />
          ))}
        </div>
      )}

      {syncLocation.error && (
        <p className="text-sm text-destructive">
          Synchronization failed: {syncLocation.error.message}
        </p>
      )}

      {deleteLocation.error && (
        <p className="text-sm text-destructive">Delete failed: {deleteLocation.error.message}</p>
      )}
    </div>
  );
}

function LocationCard({
  location,
  syncing,
  onEdit,
  onDelete,
  onSync,
  onPause,
  onToggle,
}: {
  location: Location;
  syncing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSync: (input: WeatherSyncInput) => void;
  onPause: (importId: string) => void;
  onToggle: (active: boolean) => void;
}) {
  const [selectedDecade, setSelectedDecade] = useState(IMPORT_DECADES[0]);

  const importsQuery = useQuery({
    ...importsQueryOptions(location.id),
    refetchInterval: (query) =>
      syncing || query.state.data?.some((item) => item.status === "running") ? 1000 : false,
  });

  const activeImport = importsQuery.data?.find((item) => item.status === "running");
  const pausedImport = importsQuery.data?.find((item) => item.status === "paused");
  const resumableImport = activeImport ?? pausedImport;
  const latestImport = importsQuery.data?.find((item) => item.status === "completed");
  const latestAttempt = importsQuery.data?.[0];

  const decadesQuery = useQuery(decadesQueryOptions(location.id));
  const decades = decadesQuery.data ?? [];

  const archiveEndDate = getArchiveEndDate(location.timezone);

  const decadeStatuses = IMPORT_DECADES.map((decade) => {
    const expectedEndDate =
      decade.endDate < formatDate(archiveEndDate) ? decade.endDate : formatDate(archiveEndDate);
    const expectedDays =
      expectedEndDate < decade.startDate ? 0 : daysBetween(decade.startDate, expectedEndDate);

    const storedDays =
      decades.find((item) => item.decade === Number(decade.startDate.slice(0, 3)) * 10)
        ?.storedDays ?? 0;

    const status =
      expectedDays === 0 || storedDays === 0
        ? null
        : storedDays >= expectedDays
          ? "Imported"
          : "Partial";

    return {
      label: decade.label,
      value: decade.startDate,
      status,
    };
  });

  const progress = resumableImport?.totalDays
    ? Math.round((resumableImport.processedDays / resumableImport.totalDays) * 100)
    : 0;

  const importRunning = Boolean(activeImport);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <MapPinIcon className="size-4 text-muted-foreground" />
            {location.name}
          </CardTitle>
          <CardDescription>
            {location.latitude}, {location.longitude}
          </CardDescription>
        </div>
        <Badge variant={location.isActive ? "default" : "secondary"}>
          {location.isActive ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Timezone</p>
            <p className="mt-1 font-medium">{location.timezone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last synchronization</p>
            <p className="mt-1 font-medium">
              {latestImport?.completedAt
                ? new Date(latestImport.completedAt).toLocaleDateString()
                : "Never"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Stored decades</p>
          {decades.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {decades.map(({ decade }) => (
                <Badge key={decade} variant="secondary">
                  {decade}s
                </Badge>
              ))}
            </div>
          ) : (
            <Badge variant="outline">No historical data</Badge>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={location.isActive}
              onCheckedChange={onToggle}
              aria-label={`Toggle ${location.name} active status`}
              disabled={syncing || importRunning}
            />
            <Label>Active</Label>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onEdit}
              disabled={syncing || importRunning}>
              <PencilIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onDelete}
              disabled={syncing || importRunning}>
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Select
              items={decadeStatuses}
              value={selectedDecade.startDate}
              onValueChange={(value) => {
                const decade = IMPORT_DECADES.find((item) => item.startDate === value);
                if (decade) setSelectedDecade(decade);
              }}>
              <SelectTrigger className="min-w-0 flex-1">
                <SelectValue placeholder="Select decade" />
              </SelectTrigger>
              <SelectContent>
                {decadeStatuses.map((decade) => (
                  <SelectItem key={decade.value} value={decade.value}>
                    <span className="inline-flex items-center gap-3">
                      <span>{decade.label}</span>
                      {decade.status && <Badge size="sm">{decade.status}</Badge>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="flex-1"
              disabled={syncing || importRunning}
              onClick={() =>
                onSync({
                  locationId: location.id,
                  startDate: toUtcNoon(selectedDecade.startDate),
                  endDate: toUtcNoon(selectedDecade.endDate),
                })
              }>
              <RefreshCwIcon className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Importing..." : "Import data"}
            </Button>
          </div>
        </div>

        {syncing && !importRunning && (
          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
            Preparing import...
          </div>
        )}

        {resumableImport && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {resumableImport.status === "paused" ? "Import paused" : "Import in progress"}
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>

            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}>
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {resumableImport.processedDays.toLocaleString()} of{" "}
              {resumableImport.totalDays.toLocaleString()} days processed
            </p>

            <p className="min-h-4 text-xs text-muted-foreground">
              {resumableImport.currentDate
                ? `Currently processing: ${resumableImport.currentDate}`
                : "\u00A0"}
            </p>

            <div className="flex justify-end gap-2">
              {syncing && activeImport && (
                <Button size="sm" variant="outline" onClick={() => onPause(activeImport.id)}>
                  Pause
                </Button>
              )}

              {!syncing && resumableImport && (
                <Button
                  size="sm"
                  onClick={() =>
                    onSync({
                      locationId: location.id,
                      importId: resumableImport.id,
                    })
                  }>
                  Resume
                </Button>
              )}
            </div>
          </div>
        )}

        {latestAttempt?.status === "failed" && (
          <p className="text-sm text-destructive">Import failed: {latestAttempt.errorMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
