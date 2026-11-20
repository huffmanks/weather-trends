import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    timezone: text("timezone").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    check("locations_latitude_check", sql`${table.latitude} BETWEEN -90 AND 90`),
    check("locations_longitude_check", sql`${table.longitude} BETWEEN -180 AND 180`),
  ]
);

export const dailyObservations = sqliteTable(
  "daily_observations",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    observationDate: text("observation_date").notNull(),
    weatherCode: integer("weather_code"),
    temperatureMin: real("temperature_min"),
    temperatureMax: real("temperature_max"),
    temperatureAvg: real("temperature_avg"),
    apparentTemperatureMin: real("apparent_temperature_min"),
    apparentTemperatureMax: real("apparent_temperature_max"),
    apparentTemperatureAvg: real("apparent_temperature_avg"),
    precipitationTotal: real("precipitation_total"),
    rainTotal: real("rain_total"),
    snowfallTotal: real("snowfall_total"),
    precipitationHours: real("precipitation_hours"),
    windSpeedMin: real("wind_speed_min"),
    windSpeedAvg: real("wind_speed_avg"),
    windSpeedMax: real("wind_speed_max"),
    windGustMin: real("wind_gust_min"),
    windGustAvg: real("wind_gust_avg"),
    windGustMax: real("wind_gust_max"),
    windDirection: real("wind_direction"),
    humidityMin: real("humidity_min"),
    humidityAvg: real("humidity_avg"),
    humidityMax: real("humidity_max"),
    dewPointMin: real("dew_point_min"),
    dewPointAvg: real("dew_point_avg"),
    dewPointMax: real("dew_point_max"),
    sunrise: text("sunrise"),
    sunset: text("sunset"),
    daylightDuration: real("daylight_duration"),
    sunshineDuration: real("sunshine_duration"),
    dataStatus: text("data_status", {
      enum: ["complete", "partial"],
    })
      .notNull()
      .default("complete"),

    qualityFlags: text("quality_flags", { mode: "json" }).$type<string[]>(),
    fetchedAt: integer("fetched_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("daily_observations_location_date_unique").on(
      table.locationId,
      table.observationDate
    ),
    index("daily_observations_date_idx").on(table.observationDate),
    check(
      "daily_observations_humidity_check",
      sql`(
        (${table.humidityMin} IS NULL OR ${table.humidityMin} BETWEEN 0 AND 100)
        AND (${table.humidityAvg} IS NULL OR ${table.humidityAvg} BETWEEN 0 AND 100)
        AND (${table.humidityMax} IS NULL OR ${table.humidityMax} BETWEEN 0 AND 100)
      )`
    ),
    check(
      "daily_observations_wind_direction_check",
      sql`${table.windDirection} IS NULL OR ${table.windDirection} BETWEEN 0 AND 360`
    ),
  ]
);

export const dataImports = sqliteTable(
  "data_imports",
  {
    id: text("id").primaryKey(),
    locationId: text("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: text("status", {
      enum: ["pending", "running", "paused", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    datesToImport: text("dates_to_import", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    claimToken: text("claim_token"),
    claimExpiresAt: integer("claim_expires_at"),
    recordsReceived: integer("records_received").notNull().default(0),
    recordsInserted: integer("records_inserted").notNull().default(0),
    recordsUpdated: integer("records_updated").notNull().default(0),
    errorMessage: text("error_message"),
    totalDays: integer("total_days").notNull().default(0),
    processedDays: integer("processed_days").notNull().default(0),
    currentDate: text("current_date"),
    startedAt: integer("started_at"),
    completedAt: integer("completed_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("data_imports_location_idx").on(table.locationId),
    index("data_imports_status_idx").on(table.status),
  ]
);

export const savedComparisons = sqliteTable("saved_comparisons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  configuration: text("configuration", { mode: "json" }).$type<Record<string, Json>>().notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const savedReports = sqliteTable("saved_reports", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  configuration: text("configuration", { mode: "json" }).$type<Record<string, Json>>().notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<Json>().notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type DailyObservation = typeof dailyObservations.$inferSelect;
export type NewDailyObservation = typeof dailyObservations.$inferInsert;

export type DataImport = typeof dataImports.$inferSelect;
export type NewDataImport = typeof dataImports.$inferInsert;

export type SavedComparison = typeof savedComparisons.$inferSelect;
export type SavedReport = typeof savedReports.$inferSelect;
