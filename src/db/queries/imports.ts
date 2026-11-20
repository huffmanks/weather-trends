import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { dataImports } from "@/db/schema";
import { formatDate } from "@/lib/weather/dates";

export function getImports(locationId: string, limit = 20) {
  return db
    .select()
    .from(dataImports)
    .where(eq(dataImports.locationId, locationId))
    .orderBy(desc(dataImports.createdAt))
    .limit(limit);
}

export async function getImport(id: string) {
  const [result] = await db.select().from(dataImports).where(eq(dataImports.id, id)).limit(1);
  return result;
}

export async function getLatestCompletedImport(locationId: string, startDate: Date, endDate: Date) {
  const [result] = await db
    .select()
    .from(dataImports)
    .where(
      and(
        eq(dataImports.locationId, locationId),
        eq(dataImports.status, "completed"),
        lte(dataImports.startDate, formatDate(endDate)),
        gte(dataImports.endDate, formatDate(startDate))
      )
    )
    .orderBy(desc(dataImports.completedAt))
    .limit(1);

  return result;
}

export async function createImport(input: {
  id: string;
  locationId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  datesToImport: Date[];
}) {
  const now = Date.now();

  const [result] = await db
    .insert(dataImports)
    .values({
      ...input,
      status: "running",
      startedAt: now,
      createdAt: now,
      startDate: formatDate(input.startDate),
      endDate: formatDate(input.endDate),
      datesToImport: input.datesToImport.map(formatDate),
    })
    .returning();

  return result;
}

export async function updateImportProgress(
  id: string,
  progress: {
    processedDays: number;
    currentDate: string | null;
    recordsReceived: number;
    recordsInserted: number;
    recordsUpdated: number;
  }
) {
  await db.update(dataImports).set(progress).where(eq(dataImports.id, id));
}

export async function pauseImport(id: string) {
  await db
    .update(dataImports)
    .set({ status: "paused", currentDate: null })
    .where(and(eq(dataImports.id, id), eq(dataImports.status, "running")));
}

export async function resumeImport(id: string) {
  await db
    .update(dataImports)
    .set({ status: "running", startedAt: Date.now(), completedAt: null, errorMessage: null })
    .where(and(eq(dataImports.id, id), eq(dataImports.status, "paused")));
}

export async function completeImport(id: string) {
  await db
    .update(dataImports)
    .set({
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
      currentDate: null,
    })
    .where(eq(dataImports.id, id));
}
