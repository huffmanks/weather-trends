import { eq } from "drizzle-orm";

import { db } from "@/db";
import type { AppSettingsUpdate } from "@/db/schema";
import { appSettings } from "@/db/schema";

const DEFAULT_SETTINGS = {
  id: 1,
  temperatureUnit: "celsius",
  precipitationUnit: "mm",
  windSpeedUnit: "ms",
  updatedAt: 0,
} as const;

export async function getAppSettings() {
  await db.insert(appSettings).values({ id: 1, updatedAt: Date.now() }).onConflictDoNothing();

  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);

  return settings ?? DEFAULT_SETTINGS;
}

export async function updateAppSettings(input: AppSettingsUpdate) {
  const [settings] = await db
    .insert(appSettings)
    .values({
      id: 1,
      ...input,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: {
        ...input,
        updatedAt: Date.now(),
      },
    })
    .returning();

  return settings;
}
