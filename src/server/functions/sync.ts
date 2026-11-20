import { createServerFn } from "@tanstack/react-start";

import { pauseImport } from "@/db/queries/imports";
import { syncLocation } from "@/lib/weather/sync";
import type { WeatherSyncInput } from "@/lib/weather/types";

export const syncLocationFn = createServerFn({ method: "POST" })
  .validator((input: WeatherSyncInput & { importId?: string }) => input)
  .handler(async ({ data }) => syncLocation(data));

export const pauseImportFn = createServerFn({ method: "POST" })
  .validator((input: { importId: string }) => input)
  .handler(async ({ data }) => pauseImport(data.importId));
