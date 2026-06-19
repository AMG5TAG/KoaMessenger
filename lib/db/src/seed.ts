/**
 * CLI runner for the idempotent platform-catalog seed.
 *
 * The actual upsert/prune logic lives in seed-catalog.ts (`seedCatalog`) so it
 * can also be invoked in-process at API-server startup. This file is just the
 * standalone entry: run it, report, close the pool, and exit.
 *
 * Run with:  pnpm --filter @workspace/db run seed
 */
import { pool } from "./index";
import { seedCatalog } from "./seed-catalog";

seedCatalog()
  .then(({ upserted, removed }) => {
    console.log(`Upserted ${upserted} platforms.`);
    for (const slug of removed) console.log(`Removed retired platform "${slug}".`);
  })
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    pool.end().finally(() => process.exit(1));
  });
