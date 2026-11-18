import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { dataImports } from "@/db/schema";

export async function getImports(locationId: string, limit = 20) {
  return db
    .select()
    .from(dataImports)
    .where(eq(dataImports.locationId, locationId))
    .orderBy(desc(dataImports.createdAt))
    .limit(limit);
}

export async function getLatestCompletedImport(
  locationId: string,
  startDate: string,
  endDate: string
) {
  const [result] = await db
    .select()
    .from(dataImports)
    .where(
      and(
        eq(dataImports.locationId, locationId),
        eq(dataImports.status, "completed"),
        lte(dataImports.startDate, endDate),
        gte(dataImports.endDate, startDate)
      )
    )
    .orderBy(desc(dataImports.completedAt))
    .limit(1);

  return result;
}

export async function createImport(input: {
  id: string;
  locationId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}) {
  const now = Date.now();

  const [result] = await db
    .insert(dataImports)
    .values({
      ...input,
      status: "running",
      startedAt: now,
      createdAt: now,
    })
    .returning();

  return result;
}

export async function updateImportProgress(
  id: string,
  progress: {
    processedDays: number;
    currentDate: string | null;
  }
) {
  await db.update(dataImports).set(progress).where(eq(dataImports.id, id));
}

export async function completeImport(
  id: string,
  counts: {
    recordsReceived: number;
    recordsInserted: number;
    recordsUpdated: number;
  }
) {
  await db
    .update(dataImports)
    .set({
      ...counts,
      status: "completed",
      completedAt: Date.now(),
      currentDate: null,
    })
    .where(eq(dataImports.id, id));
}

export async function failImport(id: string, error: unknown) {
  await db
    .update(dataImports)
    .set({
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown import error",
      completedAt: Date.now(),
    })
    .where(eq(dataImports.id, id));
}
