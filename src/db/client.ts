import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __fitretroDbClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set.");
}

// Reuse the connection across hot-reloads in development instead of
// exhausting Postgres connections on every file save.
const client = global.__fitretroDbClient ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") {
  global.__fitretroDbClient = client;
}

export const db = drizzle(client, { schema });
