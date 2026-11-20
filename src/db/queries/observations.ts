import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import type { NewDailyObservation } from "@/db/schema";
import { dailyObservations } from "@/db/schema";
import { formatDate } from "@/lib/weather/dates";

export async function getObservations(input: {
  locationId: string;
  startDate: string;
  endDate: string;
}) {
  return db
    .select()
    .from(dailyObservations)
    .where(
      and(
        eq(dailyObservations.locationId, input.locationId),
        gte(dailyObservations.observationDate, input.startDate),
        lte(dailyObservations.observationDate, input.endDate)
      )
    )
    .orderBy(asc(dailyObservations.observationDate));
}

export async function getAllObservations(locationId: string) {
  return db
    .select()
    .from(dailyObservations)
    .where(eq(dailyObservations.locationId, locationId))
    .orderBy(asc(dailyObservations.observationDate));
}

export async function getLatestObservation(locationId: string) {
  const [result] = await db
    .select()
    .from(dailyObservations)
    .where(eq(dailyObservations.locationId, locationId))
    .orderBy(desc(dailyObservations.observationDate))
    .limit(1);

  return result;
}

export async function getObservationDecades(locationId: string) {
  return db
    .select({
      decade: sql<number>`CAST(substr(${dailyObservations.observationDate}, 1, 3) AS INTEGER) * 10`,
      storedDays: sql<number>`count(*)`,
    })
    .from(dailyObservations)
    .where(eq(dailyObservations.locationId, locationId))
    .groupBy(sql`substr(${dailyObservations.observationDate}, 1, 3)`)
    .orderBy(sql`substr(${dailyObservations.observationDate}, 1, 3)`);
}

export async function getObservationDates(locationId: string, startDate: Date, endDate: Date) {
  return db
    .select({ observationDate: dailyObservations.observationDate })
    .from(dailyObservations)
    .where(
      and(
        eq(dailyObservations.locationId, locationId),
        gte(dailyObservations.observationDate, formatDate(startDate)),
        lte(dailyObservations.observationDate, formatDate(endDate))
      )
    )
    .orderBy(asc(dailyObservations.observationDate));
}

export async function upsertObservations(observations: NewDailyObservation[]) {
  if (observations.length === 0) {
    return { received: 0, inserted: 0, updated: 0 };
  }

  const locationId = observations[0].locationId;
  const dates = observations.map((item) => item.observationDate);

  const existing = await db
    .select({ observationDate: dailyObservations.observationDate })
    .from(dailyObservations)
    .where(
      and(
        eq(dailyObservations.locationId, locationId),
        inArray(dailyObservations.observationDate, dates)
      )
    );

  const existingDates = new Set(existing.map((item) => item.observationDate));

  await db
    .insert(dailyObservations)
    .values(observations)
    .onConflictDoUpdate({
      target: [dailyObservations.locationId, dailyObservations.observationDate],
      set: {
        weatherCode: sql`excluded.weather_code`,
        temperatureMin: sql`excluded.temperature_min`,
        temperatureMax: sql`excluded.temperature_max`,
        temperatureAvg: sql`excluded.temperature_avg`,
        apparentTemperatureMin: sql`excluded.apparent_temperature_min`,
        apparentTemperatureMax: sql`excluded.apparent_temperature_max`,
        apparentTemperatureAvg: sql`excluded.apparent_temperature_avg`,
        precipitationTotal: sql`excluded.precipitation_total`,
        rainTotal: sql`excluded.rain_total`,
        snowfallTotal: sql`excluded.snowfall_total`,
        precipitationHours: sql`excluded.precipitation_hours`,
        windSpeedMin: sql`excluded.wind_speed_min`,
        windSpeedAvg: sql`excluded.wind_speed_avg`,
        windSpeedMax: sql`excluded.wind_speed_max`,
        windGustMin: sql`excluded.wind_gust_min`,
        windGustAvg: sql`excluded.wind_gust_avg`,
        windGustMax: sql`excluded.wind_gust_max`,
        windDirection: sql`excluded.wind_direction`,
        humidityMin: sql`excluded.humidity_min`,
        humidityAvg: sql`excluded.humidity_avg`,
        humidityMax: sql`excluded.humidity_max`,
        dewPointMin: sql`excluded.dew_point_min`,
        dewPointAvg: sql`excluded.dew_point_avg`,
        dewPointMax: sql`excluded.dew_point_max`,
        sunrise: sql`excluded.sunrise`,
        sunset: sql`excluded.sunset`,
        daylightDuration: sql`excluded.daylight_duration`,
        sunshineDuration: sql`excluded.sunshine_duration`,
        dataStatus: sql`excluded.data_status`,
        qualityFlags: sql`excluded.quality_flags`,
        fetchedAt: sql`excluded.fetched_at`,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const updated = observations.filter((item) => existingDates.has(item.observationDate)).length;

  return {
    received: observations.length,
    inserted: observations.length - updated,
    updated,
  };
}
