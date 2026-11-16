export type ImportType = "initial" | "manual" | "scheduled";

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
