import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import type { NewLocation } from "@/db/schema";
import { locations } from "@/db/schema";

export async function getLocations() {
  return db.select().from(locations).orderBy(asc(locations.name));
}

export async function getActiveLocations() {
  return db
    .select()
    .from(locations)
    .where(eq(locations.isActive, true))
    .orderBy(asc(locations.name));
}

export async function getLocation(id: string) {
  const [location] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);

  return location;
}

export async function createLocation(input: NewLocation) {
  const [location] = await db.insert(locations).values(input).returning();
  return location;
}

export async function updateLocation(
  id: string,
  input: Partial<Omit<NewLocation, "id" | "createdAt">>
) {
  const [location] = await db
    .update(locations)
    .set({ ...input, updatedAt: Date.now() })
    .where(eq(locations.id, id))
    .returning();

  return location;
}

export async function deleteLocation(id: string) {
  await db.delete(locations).where(eq(locations.id, id));
}
