/**
 * Idempotent platform-catalog seed.
 *
 * Upserts every platform in `seed-data.ts` by its unique `slug`, so running it
 * repeatedly converges the `platforms` table to the canonical catalog without
 * creating duplicates or disturbing user data (users/userPlatforms reference
 * platforms by id, which is preserved on conflict).
 *
 * It does NOT delete platforms that exist in the DB but not in the seed — that
 * would orphan users' selections. Removals (e.g. Skype) are handled explicitly;
 * see the `REMOVED_SLUGS` list below, which is only pruned when no user still
 * references the platform.
 *
 * Run with:  pnpm --filter @workspace/db run seed
 */
import { sql } from "drizzle-orm";
import { db, pool, platformsTable, userPlatformsTable } from "./index";
import { platformSeed } from "./seed-data";

// Platforms intentionally retired from the catalog. Pruned only when safe
// (no user still has them added), so we never orphan a user's sidebar entry.
const REMOVED_SLUGS = ["skype"];

async function seed() {
  // Upsert the canonical catalog by slug.
  for (const p of platformSeed) {
    await db
      .insert(platformsTable)
      .values(p)
      .onConflictDoUpdate({
        target: platformsTable.slug,
        set: {
          name: p.name,
          url: p.url,
          category: p.category,
          color: p.color,
          description: p.description,
          iconUrl: p.iconUrl ?? null,
          isPopular: p.isPopular ?? false,
          embedsInIframe: p.embedsInIframe ?? true,
          iframeNotes: p.iframeNotes ?? null,
        },
      });
  }
  console.log(`Upserted ${platformSeed.length} platforms.`);

  // Safely prune retired platforms.
  for (const slug of REMOVED_SLUGS) {
    const [platform] = await db
      .select({ id: platformsTable.id })
      .from(platformsTable)
      .where(sql`${platformsTable.slug} = ${slug}`);
    if (!platform) continue;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userPlatformsTable)
      .where(sql`${userPlatformsTable.platformId} = ${platform.id}`);

    if (count > 0) {
      console.warn(
        `Skipping removal of "${slug}" — ${count} user platform(s) still reference it.`,
      );
      continue;
    }
    await db.delete(platformsTable).where(sql`${platformsTable.id} = ${platform.id}`);
    console.log(`Removed retired platform "${slug}".`);
  }
}

seed()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    pool.end().finally(() => process.exit(1));
  });
