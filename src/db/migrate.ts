import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { getDb } from "./index";
import path from "path";

export async function runMigrations() {
  console.log("[Nikot-e-Metro] Starting database migrations...");
  const db = getDb();

  if (!db) {
    console.error("[Nikot-e-Metro] Error: DATABASE_URL is not configured. Cannot run migrations.");
    process.exit(1);
  }

  try {
    const migrationsFolder = path.join(process.cwd(), "src", "db", "migrations");
    console.log(`[Nikot-e-Metro] Applying migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log("[Nikot-e-Metro] All migrations applied successfully! ✅");
  } catch (error) {
    console.error("[Nikot-e-Metro] Migration failed:", error);
    process.exit(1);
  }
}

if (process.argv[1]?.includes("migrate")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
