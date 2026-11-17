import { type QueryClient, mutationOptions, queryOptions } from "@tanstack/react-query";

import type {
  CreateLocationInput,
  ObservationRange,
  UpdateLocationInput,
  WeatherSyncInput,
} from "@/lib/weather/types";
import { getSavedComparisonsFn } from "@/server/functions/comparisons";
import {
  createLocationFn,
  deleteLocationFn,
  getLocationFn,
  getLocationsFn,
  updateLocationFn,
} from "@/server/functions/locations";
import { getImportsFn, getObservationsFn } from "@/server/functions/observations";
import { syncLocationFn } from "@/server/functions/sync";

export const weatherKeys = {
  all: ["weather"] as const,
  locations: () => [...weatherKeys.all, "locations"] as const,
  location: (id: string) => [...weatherKeys.locations(), id] as const,
  observations: (input: ObservationRange) => [...weatherKeys.all, "observations", input] as const,
  imports: (locationId: string) => [...weatherKeys.all, "imports", locationId] as const,
};

export const locationsQueryOptions = () =>
  queryOptions({
    queryKey: weatherKeys.locations(),
    queryFn: () => getLocationsFn(),
  });

export const locationQueryOptions = (id: string) =>
  queryOptions({
    queryKey: weatherKeys.location(id),
    queryFn: () => getLocationFn({ data: id }),
    enabled: Boolean(id),
  });

export const observationsQueryOptions = (input: ObservationRange) =>
  queryOptions({
    queryKey: weatherKeys.observations(input),
    queryFn: () => getObservationsFn({ data: input }),
    enabled: Boolean(input.locationId && input.startDate && input.endDate),
  });

export const importsQueryOptions = (locationId: string) =>
  queryOptions({
    queryKey: weatherKeys.imports(locationId),
    queryFn: () => getImportsFn({ data: locationId }),
    enabled: Boolean(locationId),
  });

export const createLocationMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: CreateLocationInput) => createLocationFn({ data: input }),
  });

export const updateLocationMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: UpdateLocationInput) => updateLocationFn({ data: input }),
  });

export const deleteLocationMutationOptions = () =>
  mutationOptions({
    mutationFn: (id: string) => deleteLocationFn({ data: id }),
  });

export const syncLocationMutationOptions = () =>
  mutationOptions({
    mutationFn: (input: WeatherSyncInput) => syncLocationFn({ data: input }),
  });

export const comparisonQueryKeys = {
  all: ["comparisons"] as const,
};

export function savedComparisonsQueryOptions() {
  return queryOptions({
    queryKey: comparisonQueryKeys.all,
    queryFn: () => getSavedComparisonsFn(),
  });
}

export async function invalidateLocationQueries(queryClient: QueryClient, locationId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: weatherKeys.locations(),
    }),
    ...(locationId
      ? [
          queryClient.invalidateQueries({
            queryKey: weatherKeys.location(locationId),
          }),
          queryClient.invalidateQueries({
            queryKey: [...weatherKeys.all, "observations"],
          }),
          queryClient.invalidateQueries({
            queryKey: weatherKeys.imports(locationId),
          }),
        ]
      : []),
  ]);
}
