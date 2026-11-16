import type { Location } from "@/db/schema";

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
// https://api.open-meteo.com/v1/forecast?latitude=31.8624&longitude=-81.2762&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,uv_index_clear_sky_max,wind_gusts_10m_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset,daylight_duration,sunshine_duration,rain_sum,showers_sum,snowfall_sum,precipitation_sum,precipitation_hours,precipitation_probability_max&timezone=America%2FNew_York&past_days=7&forecast_days=1&wind_speed_unit=mph&temperature_unit=fahrenheit&precipitation_unit=inch

const DAILY_VARIABLES = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
] as const;

const HOURLY_VARIABLES = [
  "temperature_2m",
  "wind_speed_10m",
  "relative_humidity_2m",
  "dew_point_2m",
] as const;

type WeatherPayload = {
  daily?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
};

function getLocalDate(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function buildUrl(endpoint: string, location: Location, startDate: string, endDate: string): URL {
  const url = new URL(endpoint);

  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("timezone", location.timezone);
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("daily", DAILY_VARIABLES.join(","));
  url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));

  return url;
}

async function fetchPayload(url: URL): Promise<WeatherPayload> {
  const response = await fetch(url, {
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
    !("hourly" in payload) ||
    typeof payload.daily !== "object" ||
    payload.daily === null ||
    typeof payload.hourly !== "object" ||
    payload.hourly === null
  ) {
    throw new Error("Open-Meteo returned an invalid response.");
  }

  return payload as WeatherPayload;
}

export async function fetchWeatherRange(
  location: Location,
  startDate: string,
  endDate: string
): Promise<WeatherPayload[]> {
  const today = getLocalDate(location.timezone);
  const archiveEnd = addDays(today, -6);
  const forecastStart = addDays(archiveEnd, 1);
  const requests: Promise<WeatherPayload>[] = [];

  if (startDate <= archiveEnd) {
    const rangeEnd = endDate < archiveEnd ? endDate : archiveEnd;

    requests.push(fetchPayload(buildUrl(ARCHIVE_URL, location, startDate, rangeEnd)));
  }

  if (endDate >= forecastStart && startDate <= today) {
    const rangeStart = startDate > forecastStart ? startDate : forecastStart;
    const rangeEnd = endDate < today ? endDate : today;

    requests.push(fetchPayload(buildUrl(FORECAST_URL, location, rangeStart, rangeEnd)));
  }

  return Promise.all(requests);
}
