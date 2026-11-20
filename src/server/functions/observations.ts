import { createServerFn } from "@tanstack/react-start";

import { getImports } from "@/db/queries/imports";
import {
  getAllObservations,
  getObservationDecades,
  getObservations,
} from "@/db/queries/observations";
import { formatDate, isValidDate } from "@/lib/weather/dates";
import type { ObservationRange } from "@/lib/weather/types";

function validateRange(input: ObservationRange) {
  if (!input.locationId.trim()) {
    throw new Error("Location ID is required.");
  }

  if (
    !isValidDate(input.startDate) ||
    !isValidDate(input.endDate) ||
    input.startDate > input.endDate
  ) {
    throw new Error("Invalid observation date range.");
  }

  return input;
}

export const getObservationsFn = createServerFn({ method: "GET" })
  .validator(validateRange)
  .handler(async ({ data }) =>
    getObservations({
      locationId: data.locationId,
      startDate: formatDate(data.startDate),
      endDate: formatDate(data.endDate),
    })
  );

export const getAllObservationsFn = createServerFn({ method: "GET" })
  .validator((locationId: string) => {
    if (!locationId.trim()) {
      throw new Error("Location ID is required.");
    }

    return locationId;
  })
  .handler(async ({ data }) => getAllObservations(data));

export const getImportsFn = createServerFn({ method: "GET" })
  .validator((locationId: string) => locationId)
  .handler(async ({ data }) => getImports(data));

export const getObservationDecadesFn = createServerFn({ method: "GET" })
  .validator((locationId: string) => locationId)
  .handler(async ({ data }) => getObservationDecades(data));
