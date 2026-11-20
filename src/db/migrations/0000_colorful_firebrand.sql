CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`temperature_unit` text DEFAULT 'celsius' NOT NULL,
	`precipitation_unit` text DEFAULT 'mm' NOT NULL,
	`wind_speed_unit` text DEFAULT 'ms' NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "app_settings_singleton_check" CHECK("app_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `daily_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`observation_date` text NOT NULL,
	`weather_code` integer,
	`temperature_min` real,
	`temperature_max` real,
	`temperature_avg` real,
	`apparent_temperature_min` real,
	`apparent_temperature_max` real,
	`apparent_temperature_avg` real,
	`precipitation_total` real,
	`rain_total` real,
	`snowfall_total` real,
	`precipitation_hours` real,
	`wind_speed_min` real,
	`wind_speed_avg` real,
	`wind_speed_max` real,
	`wind_gust_min` real,
	`wind_gust_avg` real,
	`wind_gust_max` real,
	`wind_direction` real,
	`humidity_min` real,
	`humidity_avg` real,
	`humidity_max` real,
	`dew_point_min` real,
	`dew_point_avg` real,
	`dew_point_max` real,
	`sunrise` text,
	`sunset` text,
	`daylight_duration` real,
	`sunshine_duration` real,
	`data_status` text DEFAULT 'complete' NOT NULL,
	`quality_flags` text,
	`fetched_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "daily_observations_humidity_check" CHECK((
        ("daily_observations"."humidity_min" IS NULL OR "daily_observations"."humidity_min" BETWEEN 0 AND 100)
        AND ("daily_observations"."humidity_avg" IS NULL OR "daily_observations"."humidity_avg" BETWEEN 0 AND 100)
        AND ("daily_observations"."humidity_max" IS NULL OR "daily_observations"."humidity_max" BETWEEN 0 AND 100)
      )),
	CONSTRAINT "daily_observations_wind_direction_check" CHECK("daily_observations"."wind_direction" IS NULL OR "daily_observations"."wind_direction" BETWEEN 0 AND 360)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_observations_location_date_unique` ON `daily_observations` (`location_id`,`observation_date`);--> statement-breakpoint
CREATE INDEX `daily_observations_date_idx` ON `daily_observations` (`observation_date`);--> statement-breakpoint
CREATE TABLE `data_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`location_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`dates_to_import` text DEFAULT '[]' NOT NULL,
	`claim_token` text,
	`claim_expires_at` integer,
	`records_received` integer DEFAULT 0 NOT NULL,
	`records_inserted` integer DEFAULT 0 NOT NULL,
	`records_updated` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`total_days` integer DEFAULT 0 NOT NULL,
	`processed_days` integer DEFAULT 0 NOT NULL,
	`current_date` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_imports_location_idx` ON `data_imports` (`location_id`);--> statement-breakpoint
CREATE INDEX `data_imports_status_idx` ON `data_imports` (`status`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`timezone` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "locations_latitude_check" CHECK("locations"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "locations_longitude_check" CHECK("locations"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE TABLE `saved_comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`configuration` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`configuration` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
