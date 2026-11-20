import { createServerFn } from "@tanstack/react-start";

import {
  createSavedComparison,
  deleteSavedComparison,
  getSavedComparisons,
} from "@/db/queries/comparisons";
import type { Json } from "@/db/schema";

function isJson(value: unknown): value is Json {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }

  if (Array.isArray(value)) return value.every(isJson);

  if (typeof value !== "object") return false;

  return Object.values(value).every(isJson);
}

function validateComparisonInput(input: unknown): {
  name: string;
  configuration: Record<string, Json>;
} {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid comparison.");
  }

  const { name, configuration } = input as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    throw new Error("Comparison name is required.");
  }

  if (
    typeof configuration !== "object" ||
    configuration === null ||
    Array.isArray(configuration) ||
    !isJson(configuration)
  ) {
    throw new Error("Invalid comparison configuration.");
  }

  return { name: name.trim(), configuration: configuration as Record<string, Json> };
}

export const getSavedComparisonsFn = createServerFn({ method: "GET" }).handler(
  async () => await getSavedComparisons()
);

export const createSavedComparisonFn = createServerFn({ method: "POST" })
  .validator(validateComparisonInput)
  .handler(async ({ data }) =>
    createSavedComparison({
      id: crypto.randomUUID(),
      name: data.name,
      description: null,
      configuration: data.configuration,
    })
  );

export const deleteSavedComparisonFn = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!id.trim()) throw new Error("Comparison ID is required.");
    return id;
  })
  .handler(async ({ data }) => {
    await deleteSavedComparison(data);
    return { success: true };
  });
