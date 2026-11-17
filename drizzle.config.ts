import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DB_FILE_NAME ?? "file:/app/data/weather-trends.db";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
