import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Check, Database, Gauge, Globe, Thermometer } from "lucide-react";

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
});

function SettingsPage() {
  const [temperature, setTemperature] = useState<string | null>("celsius");
  const [precipitation, setPrecipitation] = useState<string | null>("mm");
  const [windSpeed, setWindSpeed] = useState<string | null>("ms");
  const [dateFormat, setDateFormat] = useState<string | null>("iso");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
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

  const dateFormatOptions = [
    { value: "iso", label: "YYYY-MM-DD" },
    { value: "us", label: "MM/DD/YYYY" },
    { value: "international", label: "DD/MM/YYYY" },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your Weather Trends preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Thermometer className="size-5 text-muted-foreground" />
            <CardTitle>Measurement units</CardTitle>
          </div>
          <CardDescription>Choose how weather measurements are displayed.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label>Temperature</Label>
            <Select items={temperatureOptions} value={temperature} onValueChange={setTemperature}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {temperatureOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Precipitation</Label>
            <Select
              items={precipitationOptions}
              value={precipitation}
              onValueChange={setPrecipitation}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {precipitationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Wind speed</Label>
            <Select items={windSpeedOptions} value={windSpeed} onValueChange={setWindSpeed}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {windSpeedOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-5 text-muted-foreground" />
            <CardTitle>Regional preferences</CardTitle>
          </div>
          <CardDescription>Configure date formatting for the application.</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-2">
            <Label>Date format</Label>
            <Select items={dateFormatOptions} value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateFormatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="size-5 text-muted-foreground" />
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
            <Gauge className="size-5 text-muted-foreground" />
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
            <Badge variant="secondary">SQLite / LibSQL</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data storage</span>
            <span className="font-medium">Local database</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="size-4" />
            Saved locally for this session
          </span>
        )}
        <Button onClick={handleSave}>Save preferences</Button>
      </div>
    </div>
  );
}
