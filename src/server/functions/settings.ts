import { createServerFn } from "@tanstack/react-start";

import { getAppSettings, updateAppSettings } from "@/db/queries/settings";
import type { AppSettingsUpdate } from "@/db/schema";

const TEMPERATURE_UNITS = ["celsius", "fahrenheit"] as const;
const PRECIPITATION_UNITS = ["mm", "in"] as const;
const WIND_SPEED_UNITS = ["ms", "kmh", "mph"] as const;

function validateSettings(input: unknown): AppSettingsUpdate {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid settings.");
  }

  const settings = input as Record<string, unknown>;

  if (!TEMPERATURE_UNITS.includes(settings.temperatureUnit as (typeof TEMPERATURE_UNITS)[number])) {
    throw new Error("Invalid temperature unit.");
  }

  if (
    !PRECIPITATION_UNITS.includes(
      settings.precipitationUnit as (typeof PRECIPITATION_UNITS)[number]
    )
  ) {
    throw new Error("Invalid precipitation unit.");
  }

  if (!WIND_SPEED_UNITS.includes(settings.windSpeedUnit as (typeof WIND_SPEED_UNITS)[number])) {
    throw new Error("Invalid wind speed unit.");
  }

  return {
    temperatureUnit: settings.temperatureUnit as AppSettingsUpdate["temperatureUnit"],
    precipitationUnit: settings.precipitationUnit as AppSettingsUpdate["precipitationUnit"],
    windSpeedUnit: settings.windSpeedUnit as AppSettingsUpdate["windSpeedUnit"],
  };
}

export const getAppSettingsFn = createServerFn({ method: "GET" }).handler(async () =>
  getAppSettings()
);

export const updateAppSettingsFn = createServerFn({ method: "POST" })
  .validator(validateSettings)
  .handler(async ({ data }) => updateAppSettings(data));
