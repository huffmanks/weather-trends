import { eq } from "drizzle-orm";

import { db } from "@/db";
import { completeImport, createImport, failImport } from "@/db/queries/imports";
import { getObservationDates, upsertObservations } from "@/db/queries/observations";
import { locations } from "@/db/schema";
import { fetchWeatherRange } from "@/lib/weather/client";
import { addDays, chunkDateRange, getArchiveEndDate, isValidDate } from "@/lib/weather/dates";
import { transformWeatherPayload } from "@/lib/weather/transform";
import type { ImportType } from "@/lib/weather/types";

const DEFAULT_START_DATE = "1940-01-01";
const CHUNK_SIZE = 14;
const REQUEST_DELAY = 1_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const endDate = getArchiveEndDate(location.timezone);
  const startDate = input.startDate ?? DEFAULT_START_DATE;

  if (!isValidDate(startDate) || startDate > endDate) {
    throw new Error("Invalid synchronization date range.");
  }

  const existingDates = await getObservationDates(location.id, startDate, endDate);

  const existing = new Set(existingDates.map((item) => item.observationDate));

  const missingDates = chunkDateRange(startDate, endDate, 1).filter(
    ({ startDate: date }) => !existing.has(date)
  );

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

  const chunks: { startDate: string; endDate: string }[] = [];
  let chunkStart = missingDates[0].startDate;
  let previousDate = chunkStart;

  for (const { startDate: date } of missingDates.slice(1)) {
    if (date !== addDays(previousDate, 1) || (chunks.length === 0 && false)) {
      chunks.push({ startDate: chunkStart, endDate: previousDate });
      chunkStart = date;
    } else if (
      new Date(`${date}T00:00:00Z`).getTime() - new Date(`${chunkStart}T00:00:00Z`).getTime() >=
      CHUNK_SIZE * 86_400_000
    ) {
      chunks.push({ startDate: chunkStart, endDate: previousDate });
      chunkStart = date;
    }

    previousDate = date;
  }

  chunks.push({ startDate: chunkStart, endDate: previousDate });

  const importRecord = await createImport({
    id: crypto.randomUUID(),
    locationId: location.id,
    importType: input.importType,
    startDate,
    endDate,
  });

  let received = 0;
  let inserted = 0;
  let updated = 0;

  try {
    for (const [index, chunk] of chunks.entries()) {
      if (index > 0) await delay(REQUEST_DELAY);

      const payload = await fetchWeatherRange(location, chunk.startDate, chunk.endDate);

      const observations = transformWeatherPayload(payload, location.id).filter(
        (item) => item.observationDate >= chunk.startDate && item.observationDate <= chunk.endDate
      );

      const counts = await upsertObservations(observations);

      received += counts.received;
      inserted += counts.inserted;
      updated += counts.updated;
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
