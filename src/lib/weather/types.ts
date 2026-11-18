export type ImportType = "initial" | "manual" | "scheduled";

export type WeatherPayload = {
  daily?: Record<string, unknown>;
};

export type WeatherSyncInput = {
  locationId: string;
  startDate?: string;
  endDate?: string;
  importType: ImportType;
};

export type ObservationRange = {
  locationId: string;
  startDate: string;
  endDate: string;
};

export type CreateLocationInput = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type UpdateLocationInput = {
  id: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isActive?: boolean;
};

export type ImportDecade = {
  label: string;
  startDate: string;
  endDate: string;
};

export const IMPORT_DECADES: ImportDecade[] = [
  { label: "2020-2026", startDate: "2020-01-01", endDate: "2026-12-31" },
  { label: "2010-2019", startDate: "2010-01-01", endDate: "2019-12-31" },
  { label: "2000-2009", startDate: "2000-01-01", endDate: "2009-12-31" },
  { label: "1990-1999", startDate: "1990-01-01", endDate: "1999-12-31" },
  { label: "1980-1989", startDate: "1980-01-01", endDate: "1989-12-31" },
  { label: "1970-1979", startDate: "1970-01-01", endDate: "1979-12-31" },
  { label: "1960-1969", startDate: "1960-01-01", endDate: "1969-12-31" },
  { label: "1950-1959", startDate: "1950-01-01", endDate: "1959-12-31" },
  { label: "1940-1949", startDate: "1940-01-01", endDate: "1949-12-31" },
];
