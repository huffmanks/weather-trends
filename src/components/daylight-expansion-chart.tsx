import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SunlightData } from "@/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DaylightExpansionChart({
  data,
  isAllData = false,
}: {
  data: SunlightData[];
  isAllData?: boolean;
}) {
  const processedData = data.map((d, index) => ({
    ...d,
    gap: d.sunset - d.sunrise,
    index,
  }));

  const maxDay = processedData.reduce((prev, curr) => (prev.gap > curr.gap ? prev : curr));
  const minDay = processedData.reduce((prev, curr) => (prev.gap < curr.gap ? prev : curr));

  const formatGap = (gap: number) => {
    const h = Math.floor(gap);
    const m = Math.round((gap % 1) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <Card className="border-border bg-card text-card-foreground w-full">
      <CardHeader>
        <CardTitle>Sunrise & Sunset Trends</CardTitle>
        <CardDescription className="text-muted-foreground">
          Amber = Sunrise | Red = Sunset
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-100 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data as SunlightData[]}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="daylightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="sunshineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                domain={[0, 24]}
                tickCount={13}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}h`}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "sunshineTop") return [null, null];
                  const formattedTime = `${Math.floor(value)}:${Math.round((value % 1) * 60)
                    .toString()
                    .padStart(2, "0")}`;
                  return [formattedTime, name];
                }}
              />

              {/* SUNRISE */}
              <Area
                type="monotone"
                dataKey="sunrise"
                baseValue="dataMin"
                stroke="var(--chart-3)"
                fill="url(#daylightFill)"
              />

              {/* SUNSET */}
              <Area
                type="monotone"
                dataKey="sunset"
                baseValue="dataMin"
                stroke="var(--chart-5)"
                fill="url(#sunshineFill)"
              />
              {!isAllData && [
                <ReferenceLine
                  key="max-line"
                  ifOverflow="extendDomain"
                  segment={[
                    { x: maxDay.date, y: maxDay.sunrise },
                    { x: maxDay.date, y: maxDay.sunset },
                  ]}
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  strokeDasharray="4 4">
                  <Label
                    value={`Max: ${formatGap(maxDay.gap)}`}
                    position="top"
                    fill="var(--foreground)"
                    fontSize={12}
                    offset={10}
                  />
                </ReferenceLine>,
                <ReferenceDot
                  key="max-dot"
                  x={maxDay.date}
                  y={maxDay.sunset}
                  r={5}
                  fill="var(--chart-1)"
                  stroke="var(--foreground)"
                  strokeWidth={2}></ReferenceDot>,
                <ReferenceLine
                  key="min-line"
                  ifOverflow="extendDomain"
                  segment={[
                    { x: minDay.date, y: minDay.sunrise },
                    { x: minDay.date, y: minDay.sunset },
                  ]}
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  strokeDasharray="4 4">
                  <Label
                    value={`Min: ${formatGap(minDay.gap)}`}
                    position="top"
                    fill="var(--foreground)"
                    fontSize={12}
                    offset={10}
                  />
                </ReferenceLine>,
                <ReferenceDot
                  key="min-dot"
                  x={minDay.date}
                  y={minDay.sunset}
                  r={5}
                  fill="var(--chart-1)"
                  stroke="var(--foreground)"
                  strokeWidth={2}></ReferenceDot>,
              ]}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
