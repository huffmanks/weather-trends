import { createServerFn } from "@tanstack/react-start";

import {
  createLocation,
  deleteLocation,
  getLocation,
  getLocations,
  updateLocation,
} from "@/db/queries/locations";
import type { CreateLocationInput, UpdateLocationInput } from "@/lib/weather/types";

function validateCreateLocation(input: CreateLocationInput) {
  if (!input.name.trim()) throw new Error("Location name is required.");
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error("Invalid latitude.");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error("Invalid longitude.");
  }
  if (!input.timezone.trim()) throw new Error("Timezone is required.");

  return input;
}

export const getLocationsFn = createServerFn({ method: "GET" }).handler(async () => getLocations());

export const getLocationFn = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => getLocation(data));

export const createLocationFn = createServerFn({ method: "POST" })
  .validator(validateCreateLocation)
  .handler(async ({ data }) => {
    const now = Date.now();

    try {
      return await createLocation({
        ...data,
        id: crypto.randomUUID(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error("Create location failed:", error);

      if (error instanceof Error) {
        console.error("Underlying cause:", error.cause);
      }

      throw new Error(
        error instanceof Error
          ? `Failed to create location: ${error.message}${error.cause instanceof Error ? ` — ${error.cause.message}` : ""}`
          : "Failed to create location."
      );
    }
  });

export const updateLocationFn = createServerFn({ method: "POST" })
  .validator((input: UpdateLocationInput) => input)
  .handler(async ({ data }) => {
    const { id, ...updates } = data;

    if (updates.name !== undefined && !updates.name.trim()) {
      throw new Error("Location name is required.");
    }

    if (
      updates.latitude !== undefined &&
      (!Number.isFinite(updates.latitude) || updates.latitude < -90 || updates.latitude > 90)
    ) {
      throw new Error("Invalid latitude.");
    }

    if (
      updates.longitude !== undefined &&
      (!Number.isFinite(updates.longitude) || updates.longitude < -180 || updates.longitude > 180)
    ) {
      throw new Error("Invalid longitude.");
    }

    return updateLocation(id, updates);
  });

export const deleteLocationFn = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    await deleteLocation(data);
    return { success: true };
  });
