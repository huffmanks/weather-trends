import { createServerFn } from "@tanstack/react-start";

import { getImports } from "@/db/queries/imports";
import {
  getAllObservations,
  getObservationDecades,
  getObservations,
} from "@/db/queries/observations";
import { formatDate, isValidDate } from "@/lib/weather/dates";
import type { ObservationRange } from "@/lib/weather/types";

function validateRange(input: unknown): ObservationRange {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid observation date range.");
  }

  const { locationId, startDate, endDate } = input as Record<string, unknown>;

  if (typeof locationId !== "string" || !locationId.trim()) {
    throw new Error("Location ID is required.");
  }

  if (
    !(startDate instanceof Date) ||
    !(endDate instanceof Date) ||
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
    startDate > endDate
  ) {
    throw new Error("Invalid observation date range.");
  }

  return { locationId, startDate, endDate };
}

function validateLocationId(locationId: string) {
  if (!locationId.trim()) throw new Error("Location ID is required.");
  return locationId;
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
  .validator(validateLocationId)
  .handler(async ({ data }) => getAllObservations(data));

export const getImportsFn = createServerFn({ method: "GET" })
  .validator(validateLocationId)
  .handler(async ({ data }) => getImports(data));

export const getObservationDecadesFn = createServerFn({ method: "GET" })
  .validator(validateLocationId)
  .handler(async ({ data }) => getObservationDecades(data));
