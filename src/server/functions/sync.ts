import { createServerFn } from "@tanstack/react-start";

import { syncLocation } from "@/lib/weather/sync";
import type { WeatherSyncInput } from "@/lib/weather/types";

export const syncLocationFn = createServerFn({ method: "POST" })
  .validator((input: WeatherSyncInput) => input)
  .handler(async ({ data }) => syncLocation(data));
