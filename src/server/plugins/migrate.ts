import { definePlugin } from "nitro";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

export default definePlugin(async () => {
  const databaseUrl = process.env.DB_FILE_NAME ?? "file:/app/data/weather-trends.db";
  const migrationsFolder =
    process.env.NODE_ENV === "development" ? "./src/db/migrations" : "./db/migrations";

  const client = createClient({
    url: databaseUrl,
  });

  try {
    await migrate(drizzle(client), {
      migrationsFolder,
    });

    console.log("Database migrations completed.");
  } catch (error) {
    console.error("Database migration failed:", error);
    throw error;
  } finally {
    client.close();
  }
});
