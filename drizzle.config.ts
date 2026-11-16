import { defineConfig } from "drizzle-kit";

const databaseUrl =
  process.env.NODE_ENV === "development"
    ? (process.env.DB_FILE_NAME ?? "file:./src/db/development.db")
    : "file:/app/data/weather-trends.db";

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
