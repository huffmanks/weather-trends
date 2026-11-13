import { Fragment } from "react/jsx-runtime";

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

export function DaylightExpansionChart({ data }: { data: SunlightData[] }) {
  const isAllYears = data.length > 366;

  const processedData = data.map((d, index) => ({
    ...d,
    gap: d.sunset - d.sunrise,
    index,
    chartDate: `${index}-${d.date}`,
  }));

  const earliestSunrise = processedData.reduce((prev, curr) =>
    curr.sunrise < prev.sunrise ? curr : prev
  );
  const latestSunrise = processedData.reduce((prev, curr) =>
    curr.sunrise > prev.sunrise ? curr : prev
  );
  const earliestSunset = processedData.reduce((prev, curr) =>
    curr.sunset < prev.sunset ? curr : prev
  );
  const latestSunset = processedData.reduce((prev, curr) =>
    curr.sunset > prev.sunset ? curr : prev
  );

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
            <AreaChart data={processedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                type="number"
                dataKey="index"
                domain={[0, data.length - 1]}
                ticks={[
                  ...processedData
                    .filter(({ date }, index) =>
                      isAllYears
                        ? date === "Jan 01"
                        : index === 0 || data[index - 1]?.date.split(" ")[0] !== date.split(" ")[0]
                    )
                    .map(({ index }) => index),
                  data.length - 1,
                ]}
                tickFormatter={(index) => {
                  if (isAllYears && index === data.length - 1) return "";

                  const month = data[index]?.date.split(" ")[0];

                  if (!isAllYears) return month ?? "";

                  return `${2021 + processedData.filter((d) => d.index < index && d.date === "Jan 01").length}`;
                }}
                interval={0}
                padding={{ left: 0, right: 0 }}
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
                formatter={(value, name) => {
                  if (name === "sunshineTop" || typeof value !== "number") return [null, null];

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
              {[
                {
                  key: "earliest-sunrise",
                  day: earliestSunrise,
                  value: earliestSunrise.sunrise,
                  label: "Earliest Sunrise",
                  color: "var(--chart-3)",
                },
                {
                  key: "latest-sunrise",
                  day: latestSunrise,
                  value: latestSunrise.sunrise,
                  label: "Latest Sunrise",
                  color: "var(--chart-3)",
                },
                {
                  key: "earliest-sunset",
                  day: earliestSunset,
                  value: earliestSunset.sunset,
                  label: "Earliest Sunset",
                  color: "var(--chart-5)",
                },
                {
                  key: "latest-sunset",
                  day: latestSunset,
                  value: latestSunset.sunset,
                  label: "Latest Sunset",
                  color: "var(--chart-5)",
                },
              ].map(({ key, day, value, label, color }) => (
                <Fragment key={key}>
                  <ReferenceLine
                    x={day.index}
                    y1={value}
                    y2={value}
                    stroke={color}
                    strokeDasharray="4 4">
                    <Label value={label} position="top" fill={color} fontSize={12} offset={10} />
                  </ReferenceLine>
                  <ReferenceDot
                    x={day.index}
                    y={value}
                    r={5}
                    fill={color}
                    stroke="var(--foreground)"
                    strokeWidth={2}
                    label={{
                      value: label,
                      position: "top",
                      fill: color,
                      fontSize: 12,
                      offset: 10,
                    }}
                  />
                </Fragment>
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
