import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  try {
    loadEnvConfig(process.cwd());
  } catch {
    // Ignore error in environments without filesystem access
  }
}

let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let hasLoggedSource = false;

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function getDb() {
  if (dbInstance) return dbInstance;

  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    if (!hasLoggedSource && !process.env.NEXT_PHASE) {
      console.log("[Nikot-e-Metro] Data source: development fixtures (No DATABASE_URL configured)");
      hasLoggedSource = true;
    }
    return null;
  }

  try {
    if (!poolInstance) {
      poolInstance = new Pool({ connectionString: databaseUrl });
    }

    dbInstance = drizzle(poolInstance, { schema });

    if (!hasLoggedSource && !process.env.NEXT_PHASE) {
      console.log("[Nikot-e-Metro] Data source: PostgreSQL (Neon connection active)");
      hasLoggedSource = true;
    }

    return dbInstance;
  } catch (error) {
    console.error("[Nikot-e-Metro] Failed to initialize Neon database pool:", error);
    return null;
  }
}

/**
 * Programmatic Database Health Check
 * Safe, does not leak credentials or stack traces.
 */
export async function checkDatabaseHealth(): Promise<{
  isConnected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return {
      isConnected: false,
      latencyMs: 0,
      error: "DATABASE_URL is not configured",
    };
  }

  const startTime = Date.now();
  try {
    const db = getDb();
    if (!db) {
      return { isConnected: false, latencyMs: 0, error: "Database client unavailable" };
    }

    await db.execute(schema.metroLines.id ? "SELECT 1" : "SELECT 1");
    const latencyMs = Date.now() - startTime;

    return {
      isConnected: true,
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return {
      isConnected: false,
      latencyMs,
      error: error?.message ? "Database query failed" : "Unknown database error",
    };
  }
}

export const db = getDb();
export { schema };
