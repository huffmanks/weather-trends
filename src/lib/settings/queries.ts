import { mutationOptions, queryOptions } from "@tanstack/react-query";

import type { AppSettingsUpdate } from "@/db/schema";
import { getAppSettingsFn, updateAppSettingsFn } from "@/server/functions/settings";

export const settingsKeys = {
  all: ["settings"] as const,
};

export const appSettingsQueryOptions = () =>
  queryOptions({
    queryKey: settingsKeys.all,
    queryFn: () => getAppSettingsFn(),
  });

export const updateAppSettingsMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: AppSettingsUpdate) => updateAppSettingsFn({ data: input }),
  });
