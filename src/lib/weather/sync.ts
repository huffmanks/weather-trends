import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  claimImportChunk,
  completeImport,
  createImport,
  failImport,
  getImport,
  getLatestCompletedImport,
  resumeImport,
} from "@/db/queries/imports";
import {
  deleteObservations,
  getObservationDates,
  upsertObservations,
} from "@/db/queries/observations";
import { type NewDailyObservation, dataImports, locations } from "@/db/schema";
import { fetchWeatherRange } from "@/lib/weather/client";
import {
  addDays,
  daysBetween,
  formatDate,
  getArchiveEndDate,
  isValidDate,
  toUtcNoon,
} from "@/lib/weather/dates";
import { hasObservationData } from "@/lib/weather/observations";
import { transformWeatherPayload } from "@/lib/weather/transform";
import type { WeatherSyncInput } from "@/lib/weather/types";

const CHUNK_SIZE = 14;
const CLAIM_LEASE_MS = 10 * 60 * 1000;
const SIMULATE_IMPORTS = process.env.WEATHER_SYNC_SIMULATE === "true";
const SIMULATION_DELAY = 500;

type SyncResult = {
  importId: string;
  processedDays: number;
  totalDays: number;
  status: "running" | "paused" | "completed" | "busy";
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNextChunk(dates: Date[], offset: number) {
  const firstDate = dates[offset];
  if (!firstDate) return null;

  const chunk = [firstDate];

  for (const date of dates.slice(offset + 1, offset + CHUNK_SIZE)) {
    const previousDate = chunk[chunk.length - 1];

    if (date.getTime() !== addDays(previousDate, 1).getTime()) break;

    chunk.push(date);
  }

  return {
    startDate: chunk[0],
    endDate: chunk[chunk.length - 1],
    dates: chunk,
  };
}

async function createImportPlan(input: WeatherSyncInput) {
  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, input.locationId))
    .limit(1);

  if (!location) throw new Error("Location not found.");

  const { startDate, endDate: requestedEndDate } = input;

  if (startDate === undefined || requestedEndDate === undefined) {
    throw new Error("A valid start date and end date are required.");
  }

  if (!isValidDate(startDate) || !isValidDate(requestedEndDate) || startDate > requestedEndDate) {
    throw new Error("A valid start date and end date are required.");
  }

  const archiveEndDate = getArchiveEndDate(location.timezone);
  const endDate =
    requestedEndDate.getTime() < archiveEndDate.getTime() ? requestedEndDate : archiveEndDate;

  if (
    startDate > endDate ||
    Math.floor(startDate.getUTCFullYear() / 10) !== Math.floor(endDate.getUTCFullYear() / 10)
  ) {
    throw new Error("Import must contain a valid date range within a single decade.");
  }

  const existingDates = await getObservationDates(location.id, startDate, endDate);
  const existing = new Set(existingDates.map((item) => item.observationDate));

  let datesToImport = Array.from({ length: daysBetween(startDate, endDate) }, (_, index) =>
    addDays(startDate, index)
  ).filter((date) => !existing.has(formatDate(date)));

  if (datesToImport.length === 0) {
    const previousImport = await getLatestCompletedImport(location.id, startDate, endDate);
    const latestStoredDate = existingDates.at(-1)?.observationDate;
    const refreshAnchor = previousImport?.endDate ?? latestStoredDate;

    if (refreshAnchor) {
      const refreshStart = addDays(refreshAnchor, -1);
      const refreshStartDate = refreshStart < startDate ? startDate : refreshStart;

      datesToImport = Array.from({ length: daysBetween(refreshStartDate, endDate) }, (_, index) =>
        addDays(refreshStartDate, index)
      );
    }
  }

  if (datesToImport.length === 0) return null;

  const importRecord = await createImport({
    id: crypto.randomUUID(),
    locationId: location.id,
    startDate,
    endDate,
    totalDays: datesToImport.length,
    datesToImport,
  });

  return importRecord.id;
}

async function getCurrentResult(
  importId: string,
  fallbackStatus: SyncResult["status"]
): Promise<SyncResult> {
  const importRecord = await getImport(importId);

  if (!importRecord) throw new Error("Import not found.");

  return {
    importId,
    processedDays: importRecord.processedDays,
    totalDays: importRecord.totalDays,
    status:
      importRecord.status === "paused"
        ? "paused"
        : importRecord.status === "completed"
          ? "completed"
          : fallbackStatus,
  };
}

export async function syncLocation(
  input: WeatherSyncInput & { importId?: string }
): Promise<SyncResult> {
  const importId = input.importId ?? (await createImportPlan(input));

  if (!importId) {
    return {
      importId: "",
      processedDays: 0,
      totalDays: 0,
      status: "completed",
    };
  }

  let importRecord = await getImport(importId);

  if (!importRecord) throw new Error("Import not found.");

  if (importRecord.locationId !== input.locationId) {
    throw new Error("Import does not belong to this location.");
  }

  if (importRecord.status === "paused") {
    await resumeImport(importId);
    importRecord = await getImport(importId);

    if (!importRecord) throw new Error("Import not found.");
  }

  if (importRecord.status === "completed") {
    return getCurrentResult(importId, "completed");
  }

  if (importRecord.status !== "running") {
    throw new Error("This import cannot be resumed.");
  }

  const chunk = getNextChunk(importRecord.datesToImport.map(toUtcNoon), importRecord.processedDays);

  if (!chunk) {
    await completeImport(importId);
    return getCurrentResult(importId, "completed");
  }

  const claimToken = crypto.randomUUID();
  const now = Date.now();

  const claim = await claimImportChunk({
    id: importId,
    processedDays: importRecord.processedDays,
    token: claimToken,
    currentDate: formatDate(chunk.startDate),
    now,
    expiresAt: now + CLAIM_LEASE_MS,
  });

  if (!claim) {
    const current = await getImport(importId);

    if (!current) throw new Error("Import not found.");

    if (current.status === "paused") return getCurrentResult(importId, "paused");
    if (current.status === "completed") return getCurrentResult(importId, "completed");

    return getCurrentResult(importId, "busy");
  }

  try {
    let observations: NewDailyObservation[] = [];
    let emptyObservationDates: string[] = [];

    if (SIMULATE_IMPORTS) {
      await delay(SIMULATION_DELAY);
    } else {
      const [location] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, importRecord.locationId))
        .limit(1);

      if (!location) throw new Error("Location not found.");

      const payload = await fetchWeatherRange(
        location,
        formatDate(chunk.startDate),
        formatDate(chunk.endDate)
      );

      const dates = new Set(chunk.dates.map(formatDate));

      const chunkObservations: NewDailyObservation[] = transformWeatherPayload(
        payload,
        location.id
      ).filter((item) => dates.has(item.observationDate));

      observations = chunkObservations.filter(hasObservationData);

      emptyObservationDates = chunkObservations
        .filter((item) => !hasObservationData(item))
        .map((item) => item.observationDate);
    }

    const updatedImport = await db.transaction(
      async (tx) => {
        const [current] = await tx
          .select({ id: dataImports.id })
          .from(dataImports)
          .where(
            and(
              eq(dataImports.id, importId),
              eq(dataImports.status, "running"),
              eq(dataImports.claimToken, claimToken)
            )
          )
          .limit(1);

        if (!current) return null;

        await deleteObservations(importRecord.locationId, emptyObservationDates, tx);
        const counts = await upsertObservations(observations, tx);

        const [updated] = await tx
          .update(dataImports)
          .set({
            processedDays: sql`${dataImports.processedDays} + ${chunk.dates.length}`,
            recordsReceived: sql`${dataImports.recordsReceived} + ${counts.received}`,
            recordsInserted: sql`${dataImports.recordsInserted} + ${counts.inserted}`,
            recordsUpdated: sql`${dataImports.recordsUpdated} + ${counts.updated}`,
            currentDate: null,
            claimToken: null,
            claimExpiresAt: null,
          })
          .where(
            and(
              eq(dataImports.id, importId),
              eq(dataImports.status, "running"),
              eq(dataImports.claimToken, claimToken)
            )
          )
          .returning();

        return updated ?? null;
      },
      { behavior: "immediate" }
    );

    if (!updatedImport) {
      const current = await getImport(importId);

      if (!current) throw new Error("Import not found.");
      if (current.status === "paused") return getCurrentResult(importId, "paused");
      if (current.status === "completed") return getCurrentResult(importId, "completed");

      return getCurrentResult(importId, "busy");
    }

    if (updatedImport.processedDays >= updatedImport.totalDays) {
      await completeImport(importId);
      return getCurrentResult(importId, "completed");
    }

    return getCurrentResult(importId, "running");
  } catch (error) {
    await failImport(importId, claimToken, error);
    throw error;
  }
}
