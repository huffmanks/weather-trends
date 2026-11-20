export type WeatherPayload = {
  daily?: Record<string, unknown>;
};

export type WeatherSyncInput = {
  locationId: string;
  startDate?: Date;
  endDate?: Date;
  importId?: string;
};

export type ObservationRange = {
  locationId: string;
  startDate: Date;
  endDate: Date;
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
