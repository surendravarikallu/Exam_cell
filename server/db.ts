import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

// Neon free tier scale-to-zero drops connections abruptly.
// By default, the pg pool will crash the entire Node process if an idle connection drops. 
// Attaching an error handler allows it to gracefully auto-reconnect on the next request.
pool.on('error', (err, client) => {
  console.error("Database connection pool error (Neon timeout):", err.message);
});

export const db = drizzle(pool, { schema });