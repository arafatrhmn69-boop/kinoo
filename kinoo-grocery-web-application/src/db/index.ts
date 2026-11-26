import path from "node:path";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaPgliteClient?: PGlite;
  __arenaDrizzleDb?: NodePgDatabase;
};

function createDb(): NodePgDatabase {
  if (databaseUrl) {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
      });

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }

    return drizzleNodePg(pool);
  }

  // Embedded PGlite fallback when no external DATABASE_URL is configured
  const dataDir = path.join(process.cwd(), ".local", "pglite-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = globalForDb.__arenaPgliteClient ?? new PGlite(dataDir);

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaPgliteClient = client;
  }

  return drizzlePglite(client) as unknown as NodePgDatabase;
}

export const db: NodePgDatabase = globalForDb.__arenaDrizzleDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaDrizzleDb = db;
}
