import { createServerFn } from "@tanstack/react-start";

import {
  createLocation,
  deleteLocation,
  getLocation,
  getLocations,
  updateLocation,
} from "@/db/queries/locations";
import type { CreateLocationInput, UpdateLocationInput } from "@/lib/weather/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validateCoordinates(latitude: unknown, longitude: unknown) {
  if (
    typeof latitude !== "number" ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Invalid latitude.");
  }

  if (
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid longitude.");
  }
}

function validateCreateLocation(input: unknown): CreateLocationInput {
  if (!isRecord(input)) throw new Error("Invalid location.");

  if (typeof input.name !== "string" || !input.name.trim()) {
    throw new Error("Location name is required.");
  }

  validateCoordinates(input.latitude, input.longitude);

  if (!isValidTimezone(input.timezone)) {
    throw new Error("Invalid timezone.");
  }

  return input as CreateLocationInput;
}

function validateUpdateLocation(input: unknown): UpdateLocationInput {
  if (!isRecord(input) || typeof input.id !== "string" || !input.id.trim()) {
    throw new Error("Invalid location.");
  }

  const { id, name, latitude, longitude, timezone, isActive } = input;

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    throw new Error("Location name is required.");
  }

  if (
    latitude !== undefined &&
    (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90)
  ) {
    throw new Error("Invalid latitude.");
  }

  if (
    longitude !== undefined &&
    (typeof longitude !== "number" ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180)
  ) {
    throw new Error("Invalid longitude.");
  }

  if (latitude !== undefined || longitude !== undefined) {
    if (latitude === undefined || longitude === undefined) {
      throw new Error("Latitude and longitude must be updated together.");
    }
  }

  if (timezone !== undefined && !isValidTimezone(timezone)) {
    throw new Error("Invalid timezone.");
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    throw new Error("Invalid active status.");
  }

  return {
    id,
    ...(name !== undefined && { name }),
    ...(latitude !== undefined && { latitude }),
    ...(longitude !== undefined && { longitude }),
    ...(timezone !== undefined && { timezone }),
    ...(isActive !== undefined && { isActive }),
  };
}

export const getLocationsFn = createServerFn({ method: "GET" }).handler(async () => getLocations());

export const getLocationFn = createServerFn({ method: "GET" })
  .validator((id: string) => {
    if (!id.trim()) throw new Error("Location ID is required.");
    return id;
  })
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
      throw new Error("Failed to create location.");
    }
  });

export const updateLocationFn = createServerFn({ method: "POST" })
  .validator(validateUpdateLocation)
  .handler(async ({ data }) => {
    const { id, ...updates } = data;
    return updateLocation(id, updates);
  });

export const deleteLocationFn = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!id.trim()) throw new Error("Location ID is required.");
    return id;
  })
  .handler(async ({ data }) => {
    await deleteLocation(data);
    return { success: true };
  });
