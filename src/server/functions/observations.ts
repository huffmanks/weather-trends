import { createServerFn } from "@tanstack/react-start";

import { getImports } from "@/db/queries/imports";
import { getObservations } from "@/db/queries/observations";
import { isValidDate } from "@/lib/weather/dates";
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
  .handler(async ({ data }) => getObservations(data));

export const getImportsFn = createServerFn({ method: "GET" })
  .validator((locationId: string) => locationId)
  .handler(async ({ data }) => getImports(data));
