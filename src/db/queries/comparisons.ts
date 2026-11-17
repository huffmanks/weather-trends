import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { savedComparisons } from "@/db/schema";

export async function getSavedComparisons() {
  return db.select().from(savedComparisons).orderBy(desc(savedComparisons.updatedAt));
}

export async function createSavedComparison(input: {
  id: string;
  name: string;
  description: string | null;
  configuration: Record<string, unknown>;
}) {
  const now = Date.now();

  const [comparison] = await db
    .insert(savedComparisons)
    .values({
      ...input,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return comparison;
}

export async function deleteSavedComparison(id: string) {
  await db.delete(savedComparisons).where(eq(savedComparisons.id, id));
}
