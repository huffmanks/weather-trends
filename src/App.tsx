import { DaylightExpansionChart } from "@/components/daylight-expansion-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import data2021 from "@/weather-data/2021.json";
import data2022 from "@/weather-data/2022.json";
import data2023 from "@/weather-data/2023.json";
import data2024 from "@/weather-data/2024.json";
import data2025 from "@/weather-data/2025.json";

const allData = [...data2021, ...data2022, ...data2023, ...data2024, ...data2025];

export default function App() {
  return (
    <div className="flex flex-col min-h-svh w-full py-12 px-3 md:px-6">
      <h1 className="text-2xl mb-2">Year</h1>
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="2025">2025</TabsTrigger>
          <TabsTrigger value="2024">2024</TabsTrigger>
          <TabsTrigger value="2023">2023</TabsTrigger>
          <TabsTrigger value="2022">2022</TabsTrigger>
          <TabsTrigger value="2021">2021</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <DaylightExpansionChart isAllData data={allData} />
        </TabsContent>
        <TabsContent value="2025">
          <DaylightExpansionChart data={data2025} />
        </TabsContent>
        <TabsContent value="2024">
          <DaylightExpansionChart data={data2024} />
        </TabsContent>
        <TabsContent value="2023">
          <DaylightExpansionChart data={data2023} />
        </TabsContent>
        <TabsContent value="2022">
          <DaylightExpansionChart data={data2022} />
        </TabsContent>
        <TabsContent value="2021">
          <DaylightExpansionChart data={data2021} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
