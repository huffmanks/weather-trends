import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon, DatabaseIcon, GaugeIcon, ThermometerIcon } from "lucide-react";

import type { AppSettingsUpdate } from "@/db/schema";
import {
  appSettingsQueryOptions,
  settingsKeys,
  updateAppSettingsMutationOptions,
} from "@/lib/settings/queries";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.query({ ...appSettingsQueryOptions(), staleTime: "static" }),
});

type SettingsSelectProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onValueChange: (value: T | null) => void;
};

function SettingsSelect<T extends string>({
  label,
  options,
  value,
  onValueChange,
}: SettingsSelectProps<T>) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select items={options} value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const temperatureOptions = [
  { value: "celsius", label: "Celsius (°C)" },
  { value: "fahrenheit", label: "Fahrenheit (°F)" },
] as const;

const precipitationOptions = [
  { value: "mm", label: "Millimeters (mm)" },
  { value: "in", label: "Inches (in)" },
] as const;

const windSpeedOptions = [
  { value: "ms", label: "Meters per second (m/s)" },
  { value: "kmh", label: "Kilometers per hour (km/h)" },
  { value: "mph", label: "Miles per hour (mph)" },
] as const;

function SettingsPage() {
  const queryClient = useQueryClient();
  const initialSettings = Route.useLoaderData();
  const settingsQuery = useQuery(appSettingsQueryOptions());

  const [settings, setSettings] = useState<AppSettingsUpdate>(() => ({
    temperatureUnit: initialSettings.temperatureUnit,
    precipitationUnit: initialSettings.precipitationUnit,
    windSpeedUnit: initialSettings.windSpeedUnit,
  }));

  const updateSettingsMutation = useMutation({
    ...updateAppSettingsMutationOptions(),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(settingsKeys.all, updatedSettings);
      setSettings({
        temperatureUnit: updatedSettings.temperatureUnit,
        precipitationUnit: updatedSettings.precipitationUnit,
        windSpeedUnit: updatedSettings.windSpeedUnit,
      });
    },
  });

  const savedSettings = settingsQuery.data ?? initialSettings;

  const isDirty =
    settings.temperatureUnit !== savedSettings.temperatureUnit ||
    settings.precipitationUnit !== savedSettings.precipitationUnit ||
    settings.windSpeedUnit !== savedSettings.windSpeedUnit;

  function updateSetting<TKey extends keyof AppSettingsUpdate>(
    key: TKey,
    value: AppSettingsUpdate[TKey]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    await updateSettingsMutation.mutateAsync(settings);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your Weather Trends preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ThermometerIcon className="size-5 text-muted-foreground" />
            <CardTitle>Measurement units</CardTitle>
          </div>
          <CardDescription>Choose how weather measurements are displayed.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <SettingsSelect
            label="Temperature"
            options={temperatureOptions}
            value={settings.temperatureUnit}
            onValueChange={(value) => value && updateSetting("temperatureUnit", value)}
          />

          <Separator />

          <SettingsSelect
            label="Precipitation"
            options={precipitationOptions}
            value={settings.precipitationUnit}
            onValueChange={(value) => value && updateSetting("precipitationUnit", value)}
          />

          <Separator />

          <SettingsSelect
            label="Wind speed"
            options={windSpeedOptions}
            value={settings.windSpeedUnit}
            onValueChange={(value) => value && updateSetting("windSpeedUnit", value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DatabaseIcon className="size-5 text-muted-foreground" />
            <CardTitle>Data provider</CardTitle>
          </div>
          <CardDescription>Historical weather data source and synchronization.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Open-Meteo</p>
              <p className="text-sm text-muted-foreground">Historical archive and forecast API</p>
            </div>
            <Badge variant="secondary">Configured</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Historical data availability</p>
              <p className="text-sm text-muted-foreground">Archive data starting January 1940</p>
            </div>
            <Badge variant="outline">1940–Present</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GaugeIcon className="size-5 text-muted-foreground" />
            <CardTitle>Application</CardTitle>
          </div>
          <CardDescription>Application information and configuration status.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Application</span>
            <span className="font-medium">Weather Trends</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Database</span>
            <Badge variant="secondary">SQLite</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {updateSettingsMutation.isSuccess && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <CheckIcon className="size-4" />
            Preferences saved
          </span>
        )}
        <Button
          disabled={!isDirty || updateSettingsMutation.isPending}
          onClick={() => void handleSave()}>
          Save preferences
        </Button>
      </div>
    </div>
  );
}
