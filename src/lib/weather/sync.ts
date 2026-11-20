import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  completeImport,
  createImport,
  failImport,
  getImport,
  getLatestCompletedImport,
  resumeImport,
  updateImportProgress,
} from "@/db/queries/imports";
import { getObservationDates, upsertObservations } from "@/db/queries/observations";
import { locations } from "@/db/schema";
import { fetchWeatherRange } from "@/lib/weather/client";
import {
  addDays,
  daysBetween,
  formatDate,
  getArchiveEndDate,
  isValidDate,
  toUtcNoon,
} from "@/lib/weather/dates";
import { transformWeatherPayload } from "@/lib/weather/transform";
import type { WeatherSyncInput } from "@/lib/weather/types";

const CHUNK_SIZE = 14;
const SIMULATE_IMPORTS = process.env.WEATHER_SYNC_SIMULATE === "true";
const SIMULATION_DELAY = 500;

type SyncResult = {
  importId: string;
  processedDays: number;
  totalDays: number;
  status: "running" | "paused" | "completed";
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNextChunk(dates: Date[], offset: number) {
  const firstDate = dates[offset];
  if (!firstDate) return null;

  const chunk = [firstDate];

  for (const date of dates.slice(offset + 1, offset + CHUNK_SIZE)) {
    if (date.getTime() !== addDays(chunk.at(-1)!, 1).getTime()) break;
    chunk.push(date);
  }

  return {
    startDate: chunk[0],
    endDate: chunk.at(-1)!,
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

  const startDate = input.startDate;
  const requestedEndDate = input.endDate;

  if (!startDate || !requestedEndDate) {
    throw new Error("A start date and end date are required.");
  }

  const archiveEndDate = getArchiveEndDate(location.timezone);
  const endDate =
    requestedEndDate.getTime() < archiveEndDate.getTime() ? requestedEndDate : archiveEndDate;

  if (
    !isValidDate(startDate) ||
    !isValidDate(endDate) ||
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

  if (datesToImport.length === 0) {
    return null;
  }

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

  const importRecord = await getImport(importId);

  if (!importRecord) throw new Error("Import not found.");

  if (importRecord.status === "paused") {
    await resumeImport(importId);
    importRecord.status = "running";
  }

  if (importRecord.status === "completed") {
    return {
      importId,
      processedDays: importRecord.processedDays,
      totalDays: importRecord.totalDays,
      status: "completed",
    };
  }

  if (importRecord.status !== "running") {
    throw new Error("This import cannot be resumed.");
  }
  const chunk = getNextChunk(importRecord.datesToImport.map(toUtcNoon), importRecord.processedDays);

  if (!chunk) {
    await completeImport(importId);

    return {
      importId,
      processedDays: importRecord.processedDays,
      totalDays: importRecord.totalDays,
      status: "completed",
    };
  }

  try {
    await updateImportProgress(importId, {
      processedDays: importRecord.processedDays,
      currentDate: formatDate(chunk.startDate),
      recordsReceived: importRecord.recordsReceived,
      recordsInserted: importRecord.recordsInserted,
      recordsUpdated: importRecord.recordsUpdated,
    });

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

      const observations = transformWeatherPayload(payload, location.id).filter((item) =>
        dates.has(item.observationDate)
      );

      const counts = await upsertObservations(observations);

      importRecord.recordsReceived += counts.received;
      importRecord.recordsInserted += counts.inserted;
      importRecord.recordsUpdated += counts.updated;
    }

    const processedDays = importRecord.processedDays + chunk.dates.length;
    const isComplete = processedDays >= importRecord.totalDays;

    await updateImportProgress(importId, {
      processedDays,
      currentDate: null,
      recordsReceived: importRecord.recordsReceived,
      recordsInserted: importRecord.recordsInserted,
      recordsUpdated: importRecord.recordsUpdated,
    });

    const updatedImport = await getImport(importId);

    if (!updatedImport) throw new Error("Import not found.");

    if (isComplete && updatedImport.status === "running") {
      await completeImport(importId);
      updatedImport.status = "completed";
    }

    return {
      importId,
      processedDays,
      totalDays: importRecord.totalDays,
      status: updatedImport.status === "paused" ? "paused" : isComplete ? "completed" : "running",
    };
  } catch (error) {
    await failImport(importId, error);
    throw error;
  }
}
