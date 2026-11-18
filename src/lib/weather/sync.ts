import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  completeImport,
  createImport,
  failImport,
  getLatestCompletedImport,
  updateImportProgress,
} from "@/db/queries/imports";
import { getObservationDates, upsertObservations } from "@/db/queries/observations";
import { locations } from "@/db/schema";
import { fetchWeatherRange } from "@/lib/weather/client";
import { addDays, daysBetween, getArchiveEndDate, isValidDate } from "@/lib/weather/dates";
import { transformWeatherPayload } from "@/lib/weather/transform";

const CHUNK_SIZE = 14;
const REQUEST_DELAY = 1_000;
const SIMULATE_IMPORTS = process.env.WEATHER_SYNC_SIMULATE === "true";
const SIMULATION_DELAY = 500;

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
  startDate: string;
  endDate: string;
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
  const startDate = input.startDate;
  const requestedEndDate = input.endDate;
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

  let datesToImport = missingDates;

  if (missingDates.length === 0) {
    const previousImport = await getLatestCompletedImport(location.id, startDate, endDate);
    const latestStoredDate = existingDates.at(-1)?.observationDate;
    const refreshAnchor = previousImport?.endDate ?? latestStoredDate;

    if (!refreshAnchor) {
      return {
        locationId: location.id,
        startDate,
        endDate,
        received: 0,
        inserted: 0,
        updated: 0,
      };
    }

    const refreshStart = addDays(refreshAnchor, -1);
    const refreshStartDate = refreshStart < startDate ? startDate : refreshStart;

    datesToImport = Array.from({ length: daysBetween(refreshStartDate, endDate) }, (_, index) =>
      addDays(refreshStartDate, index)
    );
  }

  const chunks = buildChunks(datesToImport);

  const importRecord = await createImport({
    id: crypto.randomUUID(),
    locationId: location.id,
    startDate,
    endDate,
    totalDays: datesToImport.length,
  });

  let received = 0;
  let inserted = 0;
  let updated = 0;
  let processedDays = 0;

  try {
    for (const [index, chunk] of chunks.entries()) {
      if (SIMULATE_IMPORTS) {
        await delay(SIMULATION_DELAY);
      } else if (index > 0) {
        await delay(REQUEST_DELAY);
      }

      await updateImportProgress(importRecord.id, {
        processedDays,
        currentDate: chunk.startDate,
      });

      if (!SIMULATE_IMPORTS) {
        const payload = await fetchWeatherRange(location, chunk.startDate, chunk.endDate);

        const observations = transformWeatherPayload(payload, location.id).filter(
          (item) => item.observationDate >= chunk.startDate && item.observationDate <= chunk.endDate
        );

        const counts = await upsertObservations(observations);

        received += counts.received;
        inserted += counts.inserted;
        updated += counts.updated;
      }

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
