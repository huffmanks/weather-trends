import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import type { Location } from "@/db/schema";
import {
  createLocationMutationOptions,
  deleteLocationMutationOptions,
  importsQueryOptions,
  locationsQueryOptions,
  syncLocationMutationOptions,
  updateLocationMutationOptions,
  weatherKeys,
} from "@/lib/queries/weather";
import { today } from "@/lib/weather/dates";

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

  const syncLocation = useMutation({
    ...syncLocationMutationOptions(),
    onSuccess: async (_, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...weatherKeys.all, "observations"] }),
        queryClient.invalidateQueries({ queryKey: weatherKeys.imports(input.locationId) }),
      ]);
      setSyncingId("");
    },
    onError: () => setSyncingId(""),
  });

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

  function handleSync(locationId: string, importType: "initial" | "manual") {
    setSyncingId(locationId);
    syncLocation.mutate({
      locationId,
      importType,
      ...(importType === "initial" ? { startDate: "1940-01-01" } : {}),
      endDate: today(),
    });
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
                <Plus className="mr-2 size-4" />
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
                  placeholder="Spartanburg"
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
            <MapPin className="size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No locations configured</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Add your first location to begin collecting historical weather data.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
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
              syncing={syncingId === location.id && syncLocation.isPending}
              onEdit={() => openEditDialog(location)}
              onDelete={() => {
                if (window.confirm(`Delete ${location.name} and its associated weather data?`)) {
                  deleteLocation.mutate(location.id);
                }
              }}
              onSync={(type) => handleSync(location.id, type)}
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
  onToggle,
}: {
  location: Location;
  syncing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSync: (type: "initial" | "manual") => void;
  onToggle: (active: boolean) => void;
}) {
  const importsQuery = useQuery(importsQueryOptions(location.id));
  const latestImport = importsQuery.data?.[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground" />
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

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={location.isActive}
              onCheckedChange={onToggle}
              aria-label={`Toggle ${location.name} active status`}
            />
            <Label>Active</Label>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onDelete}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={syncing}
            onClick={() => onSync("initial")}>
            <RefreshCw className="mr-2 size-4" />
            Initial import
          </Button>
          <Button className="flex-1" disabled={syncing} onClick={() => onSync("manual")}>
            <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Refresh data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
