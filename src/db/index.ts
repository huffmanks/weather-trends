import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/db/schema";

const databaseUrl =
  process.env.NODE_ENV === "development"
    ? (process.env.DB_FILE_NAME ?? "file:./src/db/development.db")
    : "file:/app/data/weather-trends.db";

const client = createClient({ url: databaseUrl });

export const db = drizzle(client, { schema });
