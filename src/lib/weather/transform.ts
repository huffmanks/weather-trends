import type { NewDailyObservation } from "@/db/schema";
import { DAILY_VARIABLES } from "@/lib/weather/client";
import { isDateString } from "@/lib/weather/dates";
import type { WeatherPayload } from "@/lib/weather/types";

const STRING_VARIABLES = ["sunrise", "sunset"] as const;
const NUMERIC_VARIABLES = DAILY_VARIABLES.filter(
  (key) => !STRING_VARIABLES.includes(key as (typeof STRING_VARIABLES)[number])
);

function numberArray(value: unknown): (number | null)[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
}

function nullableStringArray(value: unknown): (string | null)[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => (typeof item === "string" ? item : null));
}

export function transformWeatherPayload(
  payload: WeatherPayload,
  locationId: string
): NewDailyObservation[] {
  const daily = payload.daily;

  if (!daily) throw new Error("Weather response is missing daily data.");

  const dates = daily.time;

  if (!Array.isArray(dates) || !dates.every(isDateString) || new Set(dates).size !== dates.length) {
    throw new Error("Weather response contains invalid observation dates.");
  }

  const values = Object.fromEntries(
    NUMERIC_VARIABLES.map((key) => {
      const array = numberArray(daily[key]);

      if (array.length !== dates.length) {
        throw new Error(`Invalid daily response array: ${key}`);
      }

      return [key, array];
    })
  ) as Record<(typeof NUMERIC_VARIABLES)[number], (number | null)[]>;

  const times = {
    sunrise: nullableStringArray(daily.sunrise),
    sunset: nullableStringArray(daily.sunset),
  };

  for (const key of STRING_VARIABLES) {
    if (times[key].length !== dates.length) {
      throw new Error(`Invalid daily response array: ${key}`);
    }
  }

  const fetchedAt = Date.now();

  return dates.map((date, index) => {
    const get = (key: (typeof NUMERIC_VARIABLES)[number]) => values[key][index] ?? null;

    return {
      id: crypto.randomUUID(),
      locationId,
      observationDate: date,
      weatherCode: get("weather_code"),
      temperatureMin: get("temperature_2m_min"),
      temperatureMax: get("temperature_2m_max"),
      temperatureAvg: get("temperature_2m_mean"),
      apparentTemperatureMin: get("apparent_temperature_min"),
      apparentTemperatureMax: get("apparent_temperature_max"),
      apparentTemperatureAvg: get("apparent_temperature_mean"),
      precipitationTotal: get("precipitation_sum"),
      rainTotal: get("rain_sum"),
      snowfallTotal: get("snowfall_sum"),
      precipitationHours: get("precipitation_hours"),
      windSpeedMin: get("wind_speed_10m_min"),
      windSpeedAvg: get("wind_speed_10m_mean"),
      windSpeedMax: get("wind_speed_10m_max"),
      windGustMin: get("wind_gusts_10m_min"),
      windGustAvg: get("wind_gusts_10m_mean"),
      windGustMax: get("wind_gusts_10m_max"),
      windDirection: get("wind_direction_10m_dominant"),
      humidityMin: get("relative_humidity_2m_min"),
      humidityAvg: get("relative_humidity_2m_mean"),
      humidityMax: get("relative_humidity_2m_max"),
      dewPointMin: get("dew_point_2m_min"),
      dewPointAvg: get("dew_point_2m_mean"),
      dewPointMax: get("dew_point_2m_max"),
      sunrise: times.sunrise[index] ?? null,
      sunset: times.sunset[index] ?? null,
      daylightDuration: get("daylight_duration"),
      sunshineDuration: get("sunshine_duration"),
      dataStatus: "complete" as const,
      qualityFlags: [],
      fetchedAt,
      updatedAt: fetchedAt,
    };
  });
}
