import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

const databaseUrl =
  process.env.NODE_ENV === "development"
    ? (process.env.DB_FILE_NAME ?? "file:./src/db/development.db")
    : "file:/app/data/weather-trends.db";

const client = createClient({
  url: databaseUrl,
});

try {
  const db = drizzle(client);

  await migrate(db, {
    migrationsFolder: "./db/migrations",
  });

  console.log("Database migrations completed.");
} catch (error) {
  console.error("Database migration failed:", error);
  process.exitCode = 1;
} finally {
  client.close();
}
