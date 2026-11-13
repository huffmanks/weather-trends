import type { THEMES } from "@/constants";

export type SunlightData = {
  date: string;
  sunrise: number;
  sunset: number;
  sunshine_duration_hrs: number;
  daylight_duration_hrs: number;
};

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};
