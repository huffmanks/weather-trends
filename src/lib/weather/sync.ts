import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  completeImport,
  createImport,
  failImport,
  updateImportProgress,
} from "@/db/queries/imports";
import { getObservationDates, upsertObservations } from "@/db/queries/observations";
import { locations } from "@/db/schema";
import { fetchWeatherRange } from "@/lib/weather/client";
import { addDays, daysBetween, getArchiveEndDate, isValidDate } from "@/lib/weather/dates";
import { transformWeatherPayload } from "@/lib/weather/transform";
import type { ImportType } from "@/lib/weather/types";

const DEFAULT_START_DATE = "2020-01-01";
const CHUNK_SIZE = 14;
const REQUEST_DELAY = 1_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildChunks(dates: string[]) {
  const chunks: { startDate: string; endDate: string }[] = [];
  let chunkStart = dates[0];
  let previousDate = chunkStart;

  for (const date of dates.slice(1)) {
    if (date !== addDays(previousDate, 1) || daysBetween(chunkStart, date) > CHUNK_SIZE) {
      chunks.push({ startDate: chunkStart, endDate: previousDate });
      chunkStart = date;
    }

    previousDate = date;
  }

  chunks.push({ startDate: chunkStart, endDate: previousDate });

  return chunks;
}

export async function syncLocation(input: {
  locationId: string;
  importType: ImportType;
  startDate?: string;
  endDate?: string;
}) {
  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, input.locationId))
    .limit(1);

  if (!location) {
    throw new Error("Location not found.");
  }

  const archiveEndDate = getArchiveEndDate(location.timezone);
  const startDate = input.startDate ?? DEFAULT_START_DATE;
  const requestedEndDate = input.endDate ?? archiveEndDate;
  const endDate = requestedEndDate < archiveEndDate ? requestedEndDate : archiveEndDate;

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
    startDate > endDate ||
    Math.floor(Number(startDate.slice(0, 4)) / 10) !== Math.floor(Number(endDate.slice(0, 4)) / 10)
  ) {
    throw new Error("Import must contain a valid date range within a single decade.");
  }

  const existingDates = await getObservationDates(location.id, startDate, endDate);
  const existing = new Set(existingDates.map((item) => item.observationDate));

  const missingDates = Array.from({ length: daysBetween(startDate, endDate) }, (_, index) =>
    addDays(startDate, index)
  ).filter((date) => !existing.has(date));

  if (missingDates.length === 0) {
    return {
      locationId: location.id,
      startDate,
      endDate,
      received: 0,
      inserted: 0,
      updated: 0,
    };
  }

  const chunks = buildChunks(missingDates);

  const importRecord = await createImport({
    id: crypto.randomUUID(),
    locationId: location.id,
    importType: input.importType,
    startDate,
    endDate,
    totalDays: missingDates.length,
  });

  let received = 0;
  let inserted = 0;
  let updated = 0;
  let processedDays = 0;

  try {
    for (const [index, chunk] of chunks.entries()) {
      if (index > 0) {
        await delay(REQUEST_DELAY);
      }

      await updateImportProgress(importRecord.id, {
        processedDays,
        currentDate: chunk.startDate,
      });

      const payload = await fetchWeatherRange(location, chunk.startDate, chunk.endDate);

      const observations = transformWeatherPayload(payload, location.id).filter(
        (item) => item.observationDate >= chunk.startDate && item.observationDate <= chunk.endDate
      );

      const counts = await upsertObservations(observations);

      received += counts.received;
      inserted += counts.inserted;
      updated += counts.updated;
      processedDays += daysBetween(chunk.startDate, chunk.endDate);

      await updateImportProgress(importRecord.id, {
        processedDays,
        currentDate: null,
      });
    }

    await completeImport(importRecord.id, {
      recordsReceived: received,
      recordsInserted: inserted,
      recordsUpdated: updated,
    });

    return {
      importId: importRecord.id,
      locationId: location.id,
      startDate,
      endDate,
      received,
      inserted,
      updated,
    };
  } catch (error) {
    await failImport(importRecord.id, error);
    throw error;
  }
}
