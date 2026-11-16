import { eq } from "drizzle-orm";

import { db } from "@/db";
import { completeImport, createImport, failImport } from "@/db/queries/imports";
import { upsertObservations } from "@/db/queries/observations";
import { locations } from "@/db/schema";
import { fetchWeatherRange } from "@/lib/weather/client";
import { formatDate, isValidDate } from "@/lib/weather/dates";
import { transformWeatherPayload } from "@/lib/weather/transform";
import type { ImportType } from "@/lib/weather/types";

const DEFAULT_START_DATE = "1940-01-01";
const REFRESH_DAYS = 7;

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

  if (!location.id) {
    throw new Error("Location not found.");
  }

  const today = formatDate(new Date());
  const endDate = input.endDate ?? today;
  const startDate =
    input.startDate ??
    (input.importType === "initial" ? DEFAULT_START_DATE : getRefreshStartDate());

  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    throw new Error("Invalid synchronization date range.");
  }

  const importRecord = await createImport({
    id: crypto.randomUUID(),
    locationId: location.id,
    importType: input.importType,
    startDate,
    endDate,
  });

  try {
    const payloads = await fetchWeatherRange(location, startDate, endDate);

    const observations = payloads.flatMap((payload) =>
      transformWeatherPayload(payload, location.id)
    );

    const uniqueObservations = Array.from(
      new Map(observations.map((item) => [item.observationDate, item])).values()
    ).filter((item) => item.observationDate >= startDate && item.observationDate <= endDate);

    const counts = await upsertObservations(uniqueObservations);

    await completeImport(importRecord.id, {
      recordsReceived: counts.received,
      recordsInserted: counts.inserted,
      recordsUpdated: counts.updated,
    });

    return {
      importId: importRecord.id,
      locationId: location.id,
      startDate,
      endDate,
      ...counts,
    };
  } catch (error) {
    await failImport(importRecord.id, error);
    throw error;
  }
}

function getRefreshStartDate(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - REFRESH_DAYS);
  return formatDate(date);
}
