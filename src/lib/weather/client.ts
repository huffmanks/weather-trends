import type { Location } from "@/db/schema";
import type { WeatherPayload } from "@/lib/weather/types";

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

export const DAILY_VARIABLES = [
  "weather_code",
  "temperature_2m_mean",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_mean",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "precipitation_hours",
  "relative_humidity_2m_mean",
  "relative_humidity_2m_max",
  "relative_humidity_2m_min",
  "dew_point_2m_mean",
  "dew_point_2m_max",
  "dew_point_2m_min",
  "wind_speed_10m_mean",
  "wind_speed_10m_max",
  "wind_speed_10m_min",
  "wind_gusts_10m_mean",
  "wind_gusts_10m_max",
  "wind_gusts_10m_min",
  "wind_direction_10m_dominant",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
] as const;

function buildUrl(location: Location, startDate: string, endDate: string): URL {
  const url = new URL(ARCHIVE_URL);

  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("timezone", location.timezone);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("daily", DAILY_VARIABLES.join(","));
  url.searchParams.set("models", "era5");

  return url;
}

export async function fetchWeatherRange(
  location: Location,
  startDate: string,
  endDate: string
): Promise<WeatherPayload> {
  const response = await fetch(buildUrl(location, startDate, endDate), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (${response.status}): ${await response.text()}`);
  }

  const payload: unknown = await response.json();

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("daily" in payload) ||
    typeof payload.daily !== "object" ||
    payload.daily === null
  ) {
    throw new Error("Open-Meteo returned an invalid response.");
  }

  return payload as WeatherPayload;
}
