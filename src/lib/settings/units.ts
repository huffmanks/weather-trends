import type { AppSettings } from "@/db/schema";

export function convertTemperature(value: number | null, unit: AppSettings["temperatureUnit"]) {
  if (value === null) return null;

  return unit === "fahrenheit" ? (value * 9) / 5 + 32 : value;
}

export function convertPrecipitation(value: number | null, unit: AppSettings["precipitationUnit"]) {
  if (value === null) return null;

  return unit === "in" ? value / 25.4 : value;
}

export function convertWindSpeed(value: number | null, unit: AppSettings["windSpeedUnit"]) {
  if (value === null) return null;

  switch (unit) {
    case "kmh":
      return value * 3.6;
    case "mph":
      return value * 2.236936;
    default:
      return value;
  }
}

export function getTemperatureSymbol(unit: AppSettings["temperatureUnit"]) {
  return unit === "fahrenheit" ? "°F" : "°C";
}

export function getPrecipitationSymbol(unit: AppSettings["precipitationUnit"]) {
  return unit === "in" ? "in" : "mm";
}

export function getWindSpeedSymbol(unit: AppSettings["windSpeedUnit"]) {
  switch (unit) {
    case "kmh":
      return "km/h";
    case "mph":
      return "mph";
    default:
      return "m/s";
  }
}
