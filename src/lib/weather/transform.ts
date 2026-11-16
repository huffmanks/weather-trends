import type { NewDailyObservation } from "@/db/schema";

type WeatherPayload = {
  daily?: Record<string, unknown>;
  hourly?: Record<string, unknown>;
};

type DailyRow = {
  id: string;
  locationId: string;
  observationDate: string;
  temperatureMin: number | null;
  temperatureMax: number | null;
  temperatureAvg: number | null;
  precipitationTotal: number | null;
  rainTotal: number | null;
  snowfallTotal: number | null;
  snowDepth: number | null;
  windSpeedAvg: number | null;
  windSpeedMax: number | null;
  windGustMax: number | null;
  windDirection: number | null;
  humidityMin: number | null;
  humidityAvg: number | null;
  humidityMax: number | null;
  dewPointMin: number | null;
  dewPointAvg: number | null;
  dewPointMax: number | null;
  dataStatus: "complete" | "partial";
  qualityFlags: string[];
  fetchedAt: number;
  updatedAt: number;
};

function numberArray(value: unknown): (number | null)[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => (typeof item === "number" && Number.isFinite(item) ? item : null));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
}

function mean(values: (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null);

  if (valid.length === 0) return null;

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function minimum(values: (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length ? Math.min(...valid) : null;
}

function maximum(values: (number | null)[]): number | null {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length ? Math.max(...valid) : null;
}

function dailyValues(daily: Record<string, unknown>, key: string): (number | null)[] {
  return numberArray(daily[key]);
}

function hourlyValuesByDate(
  hourly: Record<string, unknown>,
  key: string
): Map<string, (number | null)[]> {
  const times = stringArray(hourly.time);
  const values = numberArray(hourly[key]);
  const result = new Map<string, (number | null)[]>();

  times.forEach((time, index) => {
    const date = time.slice(0, 10);
    const dayValues = result.get(date) ?? [];
    dayValues.push(values[index] ?? null);
    result.set(date, dayValues);
  });

  return result;
}

export function transformWeatherPayload(
  payload: WeatherPayload,
  locationId: string
): NewDailyObservation[] {
  if (!payload.daily || !payload.hourly) {
    throw new Error("Weather response is missing daily or hourly data.");
  }

  const daily = payload.daily;
  const hourly = payload.hourly;
  const dates = stringArray(daily.time);

  const dailyKeys = [
    "temperature_2m_min",
    "temperature_2m_max",
    "precipitation_sum",
    "rain_sum",
    "snowfall_sum",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant",
  ];

  for (const key of dailyKeys) {
    if (numberArray(daily[key]).length !== dates.length) {
      throw new Error(`Invalid daily response array: ${key}`);
    }
  }

  const hourlyByDate = {
    temperature: hourlyValuesByDate(hourly, "temperature_2m"),
    wind: hourlyValuesByDate(hourly, "wind_speed_10m"),
    humidity: hourlyValuesByDate(hourly, "relative_humidity_2m"),
    dewPoint: hourlyValuesByDate(hourly, "dew_point_2m"),
  };

  const values = Object.fromEntries(dailyKeys.map((key) => [key, dailyValues(daily, key)]));

  const fetchedAt = Date.now();

  return dates.map((date, index) => {
    const temperature = hourlyByDate.temperature.get(date) ?? [];
    const wind = hourlyByDate.wind.get(date) ?? [];
    const humidity = hourlyByDate.humidity.get(date) ?? [];
    const dewPoint = hourlyByDate.dewPoint.get(date) ?? [];

    const row: DailyRow = {
      id: crypto.randomUUID(),
      locationId,
      observationDate: date,
      temperatureMin: values.temperature_2m_min[index] ?? null,
      temperatureMax: values.temperature_2m_max[index] ?? null,
      temperatureAvg: mean(temperature),
      precipitationTotal: values.precipitation_sum[index] ?? null,
      rainTotal: values.rain_sum[index] ?? null,
      snowfallTotal: values.snowfall_sum[index] ?? null,
      snowDepth: null,
      windSpeedAvg: mean(wind),
      windSpeedMax: values.wind_speed_10m_max[index] ?? null,
      windGustMax: values.wind_gusts_10m_max[index] ?? null,
      windDirection: values.wind_direction_10m_dominant[index] ?? null,
      humidityMin: minimum(humidity),
      humidityAvg: mean(humidity),
      humidityMax: maximum(humidity),
      dewPointMin: minimum(dewPoint),
      dewPointAvg: mean(dewPoint),
      dewPointMax: maximum(dewPoint),
      dataStatus: temperature.length && humidity.length && dewPoint.length ? "complete" : "partial",
      qualityFlags: [],
      fetchedAt,
      updatedAt: fetchedAt,
    };

    return row;
  });
}
