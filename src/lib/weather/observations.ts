import type { NewDailyObservation } from "@/db/schema";

const OBSERVATION_FIELDS = [
  "weatherCode",
  "temperatureMin",
  "temperatureMax",
  "temperatureAvg",
  "apparentTemperatureMin",
  "apparentTemperatureMax",
  "apparentTemperatureAvg",
  "precipitationTotal",
  "rainTotal",
  "snowfallTotal",
  "precipitationHours",
  "windSpeedMin",
  "windSpeedAvg",
  "windSpeedMax",
  "windGustMin",
  "windGustAvg",
  "windGustMax",
  "windDirection",
  "humidityMin",
  "humidityAvg",
  "humidityMax",
  "dewPointMin",
  "dewPointAvg",
  "dewPointMax",
  "sunrise",
  "sunset",
  "daylightDuration",
  "sunshineDuration",
] as const satisfies readonly (keyof NewDailyObservation)[];

export function hasObservationData(observation: NewDailyObservation): boolean {
  return OBSERVATION_FIELDS.some((field) => observation[field] != null);
}

const DASHBOARD_FIELDS = [
  "temperatureMin",
  "temperatureMax",
  "temperatureAvg",
  "precipitationTotal",
  "windSpeedAvg",
  "humidityAvg",
] as const satisfies readonly (keyof NewDailyObservation)[];

export function hasDashboardData(observation: NewDailyObservation): boolean {
  return DASHBOARD_FIELDS.some((field) => observation[field] != null);
}
