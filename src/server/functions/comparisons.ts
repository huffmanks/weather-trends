import { createServerFn } from "@tanstack/react-start";

import {
  createSavedComparison,
  deleteSavedComparison,
  getSavedComparisons,
} from "@/db/queries/comparisons";
import type { Json } from "@/db/schema";

export const getSavedComparisonsFn = createServerFn({ method: "GET" }).handler(
  async () => await getSavedComparisons()
);

export const createSavedComparisonFn = createServerFn({ method: "POST" })
  .validator((input: { name: string; configuration: Record<string, Json> }) => {
    if (!input.name.trim()) {
      throw new Error("Comparison name is required.");
    }

    if (typeof input.configuration !== "object" || Array.isArray(input.configuration)) {
      throw new Error("Invalid comparison configuration.");
    }

    return input;
  })
  .handler(async ({ data }) =>
    createSavedComparison({
      id: crypto.randomUUID(),
      name: data.name.trim(),
      description: null,
      configuration: data.configuration,
    })
  );

export const deleteSavedComparisonFn = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    await deleteSavedComparison(data);
    return { success: true };
  });
