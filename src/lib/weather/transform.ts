import type { NewDailyObservation } from "@/db/schema";
import { DAILY_VARIABLES } from "@/lib/weather/client";
import type { WeatherPayload } from "@/lib/weather/types";

function numberArray(value: unknown): (number | null)[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
}

export function transformWeatherPayload(
  payload: WeatherPayload,
  locationId: string
): NewDailyObservation[] {
  const daily = payload.daily;

  if (!daily) {
    throw new Error("Weather response is missing daily data.");
  }

  const dates = stringArray(daily.time);

  for (const key of DAILY_VARIABLES) {
    if (numberArray(daily[key]).length !== dates.length) {
      throw new Error(`Invalid daily response array: ${key}`);
    }
  }

  const values = Object.fromEntries(DAILY_VARIABLES.map((key) => [key, numberArray(daily[key])]));

  const times = {
    sunrise: stringArray(daily.sunrise),
    sunset: stringArray(daily.sunset),
  };

  const fetchedAt = Date.now();

  return dates.map((date, index) => {
    const get = (key: (typeof DAILY_VARIABLES)[number]) => values[key][index] ?? null;

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
      dataStatus: "complete",
      qualityFlags: [],
      fetchedAt,
      updatedAt: fetchedAt,
    };
  });
}
